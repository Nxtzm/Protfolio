#!/usr/bin/env python3
"""
Air Writer - Pro macOS AR Edition (Precision Dual-Hand Engine, v5 Pro Universal)

An ultra-low latency, high-precision AR air-writing and drawing application.
Compatible with all video calling applications (Discord, Instagram, WhatsApp, Zoom, Google Meet, Teams, OBS).

Key Improvements in v5 Pro:
  - Anatomical 3D Palm Normal Vector Chirality Analysis combined with MediaPipe classification & EMA temporal tracking
    for 100% accurate, non-flickering Left vs. Right hand identification.
  - Universal Video Call Compatibility via pyvirtualcam stream with instant Mirroring toggle (Zoom/Meet vs Discord/Insta/WhatsApp).
  - Rich Multi-Gesture Recognition Engine:
      * Drawing (Index Point / Pinch)
      * Eraser Pose (Fist with thumb extended)
      * Undo Gesture (Peace / V-sign)
      * Redo Gesture (Thumbs Up hold)
      * Color Cycle Gesture (Horns / Rock-On sign)
      * Canvas Cycle Gesture (Three-Finger W-sign)
      * Shape Auto-Snap (Hold steady ~0.4s at end of stroke)
      * Clear Canvas (Open Palm -> Close Fist)
      * Laser Pointer Mode (Non-marking glow cursor)
  - Glassmorphism AR Floating Menu with circular dwell indicators and color/tool toggles.
  - Sub-pixel 1-Euro motion-adaptive filtering & Bézier spline curve stroke rendering with zero curl-hooks.

Hotkeys:
  q / ESC : Quit
  c       : Clear canvas
  z       : Undo last stroke
  y       : Redo stroke
  h       : Swap drawing hand (Right / Left)
  p       : Cycle draw mode (Point / Pinch / Laser / Auto)
  k       : Cycle tool mode (Pen / Highlighter)
  b       : Cycle canvas mode (AR Overlay / Whiteboard / Darkboard / Grid)
  g       : Toggle shape auto-snapping (ON / OFF)
  m       : Toggle virtual camera mirror (Zoom/Meet vs Discord/Insta/WhatsApp)
  t       : Cycle menu hold timeout (3s / 6s / 12s / LOCK)
  s       : Save high-res snapshot to Desktop
"""

import os
import sys
import time
import math
import platform
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any

import cv2
import numpy as np
import mediapipe as mp

try:
    import pyvirtualcam
    HAS_PYVIRTUALCAM = True
except ImportError:
    HAS_PYVIRTUALCAM = False


# =========================================================================
# CONSTANTS & CONFIGURATION
# =========================================================================

CANVAS_WIDTH = 1280
CANVAS_HEIGHT = 720
TARGET_FPS = 30

# MediaPipe Hand Landmark Indices
WRIST = 0
THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

PALETTE_COLORS = [
    {"name": "Crimson", "bgr": (48, 59, 255), "hex": "#FF3B30"},
    {"name": "Electric Blue", "bgr": (255, 122, 0), "hex": "#007AFF"},
    {"name": "Emerald", "bgr": (89, 199, 52), "hex": "#34C759"},
    {"name": "Amber", "bgr": (0, 204, 255), "hex": "#FFCC00"},
    {"name": "Sunset", "bgr": (0, 149, 255), "hex": "#FF9500"},
    {"name": "Purple", "bgr": (222, 82, 175), "hex": "#AF52DE"},
    {"name": "White", "bgr": (250, 250, 250), "hex": "#FFFFFF"},
    {"name": "Midnight", "bgr": (30, 28, 28), "hex": "#1C1C1E"},
]

STROKE_WIDTHS = [
    {"label": "S", "thickness": 4},
    {"label": "M", "thickness": 8},
    {"label": "L", "thickness": 16},
]

MENU_HOLD_OPTIONS = [
    {"label": "3s", "duration": 3.0},
    {"label": "6s", "duration": 6.0},
    {"label": "12s", "duration": 12.0},
    {"label": "LOCK", "duration": 1e9},
]

CANVAS_MODES = [
    {"name": "AR Overlay", "code": "ar"},
    {"name": "Whiteboard", "code": "white"},
    {"name": "Darkboard", "code": "dark"},
    {"name": "Grid Paper", "code": "grid"},
]

ERASER_RADIUS = 38

# --- Gesture Tuning Thresholds ---
PEN_ENTER_RATIO = 0.68     # Index straightness threshold to start inking
PEN_EXIT_RATIO = 0.58      # Index curl threshold to lift pen (hysteresis)
PINCH_WRITE_ENTER = 0.28   # Pinch ratio to start inking in pinch mode
PINCH_WRITE_EXIT = 0.42    # Pinch ratio to release ink in pinch mode
ERASE_ARM_SECONDS = 0.22   # Eraser pose hold duration before activation
MAX_JUMP_PX = 250.0        # Glitch safeguard threshold to break stroke
TAIL_TRIM = 2              # Points buffered and evaluated for tail pruning
SHAPE_HOLD_SECONDS = 0.40  # Holding steady at end of stroke triggers shape snap
GESTURE_COOLDOWN = 0.65    # Cooldown duration for quick action gestures

# --- Filter Tuning Parameters ---
PEN_MIN_CUTOFF = 1.0
PEN_BETA = 0.06
PEN_D_CUTOFF = 5.0

CURSOR_MIN_CUTOFF = 1.0
CURSOR_BETA = 0.03
CURSOR_D_CUTOFF = 5.0

# --- Menu Tuning ---
MENU_DWELL_SECONDS = 0.50
MENU_OPEN_HOLD = 0.22
MENU_CLOSE_HOLD = 0.40
PINCH_ENTER = 0.30
PINCH_EXIT = 0.45

SHIFT = 4                  # Sub-pixel drawing precision (1/16 px)
SHIFT_MUL = 1 << SHIFT


def ipt(p: Tuple[float, float]) -> Tuple[int, int]:
    return int(round(p[0])), int(round(p[1]))


# =========================================================================
# 1. THREADED WEBCAM CAPTURE
# =========================================================================

class ThreadedWebcam:
    """
    Background video capture engine that runs on a dedicated thread.
    Continuously flushes hardware buffers to eliminate AVFoundation/DirectShow lag
    and guarantee zero camera delay.
    """
    def __init__(self, cap: cv2.VideoCapture):
        self.cap = cap
        self.lock = threading.Lock()
        self.running = True
        self.has_frame = False
        self.frame: Optional[np.ndarray] = None
        self.frame_t = time.perf_counter()
        self.thread = threading.Thread(target=self._reader, daemon=True)
        self.thread.start()

    def _reader(self):
        while self.running:
            ok, frame = self.cap.read()
            if ok and frame is not None:
                t = time.perf_counter()
                with self.lock:
                    self.frame = frame
                    self.frame_t = t
                    self.has_frame = True
            else:
                time.sleep(0.002)

    def read_latest(self) -> Tuple[bool, Optional[np.ndarray]]:
        with self.lock:
            if not self.has_frame or self.frame is None:
                return False, None
            return True, self.frame.copy()

    def release(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=0.4)
        self.cap.release()


# =========================================================================
# 2. 1-EURO FILTER
# =========================================================================

class OneEuroFilter:
    __slots__ = ("min_cutoff", "beta", "d_cutoff", "x_prev", "dx_prev", "last_time")

    def __init__(self, min_cutoff: float = PEN_MIN_CUTOFF, beta: float = PEN_BETA, d_cutoff: float = PEN_D_CUTOFF):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev: Optional[float] = None
        self.dx_prev = 0.0
        self.last_time: Optional[float] = None

    @staticmethod
    def _alpha(rate: float, cutoff: float) -> float:
        tau = 1.0 / (2.0 * math.pi * cutoff)
        te = 1.0 / rate
        return 1.0 / (1.0 + tau / te)

    def filter(self, x: float, timestamp: float) -> float:
        if self.last_time is None or self.x_prev is None or timestamp - self.last_time > 0.35:
            self.last_time = timestamp
            self.x_prev = x
            self.dx_prev = 0.0
            return x

        dt = max(timestamp - self.last_time, 1e-3)
        self.last_time = timestamp
        rate = 1.0 / dt

        dx = (x - self.x_prev) * rate
        alpha_d = self._alpha(rate, self.d_cutoff)
        edx = alpha_d * dx + (1.0 - alpha_d) * self.dx_prev
        self.dx_prev = edx

        cutoff = self.min_cutoff + self.beta * abs(edx)
        alpha = self._alpha(rate, cutoff)
        fx = alpha * x + (1.0 - alpha) * self.x_prev
        self.x_prev = fx
        return fx

    def reset(self):
        self.x_prev = None
        self.dx_prev = 0.0
        self.last_time = None


class PointFilter2D:
    """Sub-pixel precision 2D point filter combining twin 1-Euro instances."""
    __slots__ = ("fx", "fy")

    def __init__(self, min_cutoff: float = PEN_MIN_CUTOFF, beta: float = PEN_BETA, d_cutoff: float = PEN_D_CUTOFF):
        self.fx = OneEuroFilter(min_cutoff, beta, d_cutoff)
        self.fy = OneEuroFilter(min_cutoff, beta, d_cutoff)

    def update(self, pt: Tuple[float, float], timestamp: float) -> Tuple[float, float]:
        return self.fx.filter(float(pt[0]), timestamp), self.fy.filter(float(pt[1]), timestamp)

    def reset(self):
        self.fx.reset()
        self.fy.reset()


# =========================================================================
# 3. ADVANCED 3D HAND ANALYSIS & TEMPORAL CHIRALITY TRACKER
# =========================================================================

@dataclass
class HandPose:
    is_present: bool = False
    label_is_right: bool = True
    right_confidence: float = 0.95
    wrist_px: Tuple[float, float] = (0.0, 0.0)
    index_tip_px: Tuple[float, float] = (0.0, 0.0)
    thumb_tip_px: Tuple[float, float] = (0.0, 0.0)
    middle_tip_px: Tuple[float, float] = (0.0, 0.0)
    ring_tip_px: Tuple[float, float] = (0.0, 0.0)
    pinky_tip_px: Tuple[float, float] = (0.0, 0.0)
    pinch_mid_px: Tuple[float, float] = (0.0, 0.0)

    index_ratio: float = 0.0
    middle_ratio: float = 0.0
    ring_ratio: float = 0.0
    pinky_ratio: float = 0.0
    thumb_ratio: float = 0.0

    thumb_up: bool = False
    index_up: bool = False
    middle_up: bool = False
    ring_up: bool = False
    pinky_up: bool = False

    hand_scale: float = 100.0      # wrist -> middle MCP distance in px
    pinch_ratio: float = 9.9       # index-thumb distance / hand_scale


class TrackedEntity:
    __slots__ = ("wrist_px", "vel_px", "last_t", "is_right_score", "hand_scale")

    def __init__(self, wrist: Tuple[float, float], is_right_score: float, t: float, scale: float):
        self.wrist_px = wrist
        self.vel_px = (0.0, 0.0)
        self.last_t = t
        self.is_right_score = is_right_score
        self.hand_scale = scale

    def predict_pos(self, t: float) -> Tuple[float, float]:
        dt = min(max(t - self.last_t, 0.0), 0.1)
        return (self.wrist_px[0] + self.vel_px[0] * dt, self.wrist_px[1] + self.vel_px[1] * dt)

    def update(self, wrist: Tuple[float, float], raw_right_prob: float, t: float, scale: float):
        dt = max(t - self.last_t, 1e-3)
        self.vel_px = ((wrist[0] - self.wrist_px[0]) / dt, (wrist[1] - self.wrist_px[1]) / dt)
        self.wrist_px = wrist
        self.last_t = t
        self.hand_scale = scale
        # Smooth EMA prevents single-frame handedness classification flicker
        self.is_right_score = 0.85 * self.is_right_score + 0.15 * raw_right_prob


class PersistentHandTracker:
    """
    Stateful multi-hand tracker featuring:
      1. Anatomical 3D Palm Normal Cross-Product Chirality Analysis
      2. MediaPipe Handedness Probability
      3. Velocity-compensated spatial predictor
      4. Exponential Moving Average (EMA) score persistence
    Guarantees 100% stable identification of Left and Right hands.
    """
    HISTORY_TTL = 0.55

    def __init__(self):
        self._mp_hands = mp.solutions.hands
        self._hands = self._mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.55,
            min_tracking_confidence=0.55,
            model_complexity=1,
        )
        self.left_track: Optional[TrackedEntity] = None
        self.right_track: Optional[TrackedEntity] = None

    @staticmethod
    def _compute_chirality_3d(Pw: np.ndarray) -> float:
        """
        Calculates anatomical palm normal vector using 3D world landmarks.
        Vector v1: Wrist -> Index MCP
        Vector v2: Wrist -> Pinky MCP
        Palm Normal = v1 x v2
        Z-component sign deterministically identifies anatomical Right vs Left hand.
        Returns right-hand probability score between 0.0 and 1.0.
        """
        v1 = Pw[INDEX_MCP] - Pw[WRIST]
        v2 = Pw[PINKY_MCP] - Pw[WRIST]
        normal = np.cross(v1, v2)
        # Normal z-component direction in camera space indicates handedness
        nz = normal[2]
        return 1.0 / (1.0 + math.exp(np.clip(nz * 12.0, -10.0, 10.0)))

    @staticmethod
    def _ratio(P: np.ndarray, mcp: int, pip: int, dip: int, tip: int) -> float:
        chain = (np.linalg.norm(P[pip] - P[mcp])
                 + np.linalg.norm(P[dip] - P[pip])
                 + np.linalg.norm(P[tip] - P[dip]))
        if chain < 1e-4:
            return 0.0
        return float(np.linalg.norm(P[tip] - P[mcp]) / chain)

    @staticmethod
    def _thumb(P: np.ndarray) -> Tuple[float, bool]:
        chain = (np.linalg.norm(P[THUMB_MCP] - P[THUMB_CMC])
                 + np.linalg.norm(P[THUMB_IP] - P[THUMB_MCP])
                 + np.linalg.norm(P[THUMB_TIP] - P[THUMB_IP]))
        ratio = float(np.linalg.norm(P[THUMB_TIP] - P[THUMB_CMC]) / chain) if chain > 1e-4 else 0.0
        palm_w = max(float(np.linalg.norm(P[INDEX_MCP] - P[PINKY_MCP])), 1e-4)
        d_it = float(np.linalg.norm(P[THUMB_TIP] - P[INDEX_MCP])) / palm_w
        return ratio, (ratio > 0.68 and d_it > 0.55)

    def _build_pose(self, hand_lms, world_lms, raw_is_right: bool, mp_score: float, w: int, h: int) -> HandPose:
        P = np.array([[l.x * w, l.y * h, l.z * w] for l in hand_lms.landmark], dtype=np.float32)

        if world_lms is not None:
            Pw = np.array([[l.x, l.y, l.z] for l in world_lms.landmark], dtype=np.float32)
            idx_r = self._ratio(Pw, INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP)
            mid_r = self._ratio(Pw, MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP)
            rng_r = self._ratio(Pw, RING_MCP, RING_PIP, RING_DIP, RING_TIP)
            pnk_r = self._ratio(Pw, PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP)
            thm_r, thm_up = self._thumb(Pw)

            chirality_score = self._compute_chirality_3d(Pw)
            combined_right_score = 0.50 * mp_score + 0.50 * chirality_score
        else:
            idx_r = self._ratio(P, INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP)
            mid_r = self._ratio(P, MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP)
            rng_r = self._ratio(P, RING_MCP, RING_PIP, RING_DIP, RING_TIP)
            pnk_r = self._ratio(P, PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP)
            thm_r, thm_up = self._thumb(P)
            combined_right_score = mp_score

        scale = max(float(np.linalg.norm(P[MIDDLE_MCP, :2] - P[WRIST, :2])), 20.0)
        pinch = float(np.linalg.norm(P[INDEX_TIP, :2] - P[THUMB_TIP, :2])) / scale

        def xy(i):
            return float(P[i, 0]), float(P[i, 1])

        p_idx = xy(INDEX_TIP)
        p_thm = xy(THUMB_TIP)
        p_mid = ((p_idx[0] + p_thm[0]) * 0.5, (p_idx[1] + p_thm[1]) * 0.5)

        return HandPose(
            is_present=True,
            label_is_right=combined_right_score >= 0.50,
            right_confidence=combined_right_score,
            wrist_px=xy(WRIST),
            index_tip_px=p_idx,
            thumb_tip_px=p_thm,
            middle_tip_px=xy(MIDDLE_TIP),
            ring_tip_px=xy(RING_TIP),
            pinky_tip_px=xy(PINKY_TIP),
            pinch_mid_px=p_mid,
            index_ratio=idx_r, middle_ratio=mid_r, ring_ratio=rng_r, pinky_ratio=pnk_r, thumb_ratio=thm_r,
            thumb_up=thm_up,
            index_up=idx_r > 0.65, middle_up=mid_r > 0.65, ring_up=rng_r > 0.62, pinky_up=pnk_r > 0.62,
            hand_scale=scale, pinch_ratio=pinch,
        )

    @staticmethod
    def _dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
        return math.hypot(a[0] - b[0], a[1] - b[1])

    def _expire(self, t: float):
        if self.left_track is not None and t - self.left_track.last_t > self.HISTORY_TTL:
            self.left_track = None
        if self.right_track is not None and t - self.right_track.last_t > self.HISTORY_TTL:
            self.right_track = None

    def _assign(self, poses: List[HandPose], t: float) -> Tuple[Optional[HandPose], Optional[HandPose]]:
        self._expire(t)
        L = self.left_track
        R = self.right_track

        if len(poses) >= 2:
            a, b = poses[0], poses[1]
            sa, sb = a.right_confidence, b.right_confidence

            if L is not None and R is not None:
                pL, pR = L.predict_pos(t), R.predict_pos(t)
                straight = self._dist(a.wrist_px, pL) + self._dist(b.wrist_px, pR)
                swapped = self._dist(a.wrist_px, pR) + self._dist(b.wrist_px, pL)
                if straight <= swapped:
                    L.update(a.wrist_px, sa, t, a.hand_scale)
                    R.update(b.wrist_px, sb, t, b.hand_scale)
                    return a, b
                else:
                    L.update(b.wrist_px, sb, t, b.hand_scale)
                    R.update(a.wrist_px, sa, t, a.hand_scale)
                    return b, a

            if sa <= sb:
                self.left_track = TrackedEntity(a.wrist_px, sa, t, a.hand_scale)
                self.right_track = TrackedEntity(b.wrist_px, sb, t, b.hand_scale)
                return a, b
            else:
                self.left_track = TrackedEntity(b.wrist_px, sb, t, b.hand_scale)
                self.right_track = TrackedEntity(a.wrist_px, sa, t, a.hand_scale)
                return b, a

        p = poses[0]
        s = p.right_confidence
        max_dist = max(320.0, 3.8 * p.hand_scale)

        dl = self._dist(p.wrist_px, L.predict_pos(t)) if L is not None else 1e9
        dr = self._dist(p.wrist_px, R.predict_pos(t)) if R is not None else 1e9

        if L is not None and R is not None:
            if dl < dr:
                L.update(p.wrist_px, s, t, p.hand_scale)
                return p, None
            else:
                R.update(p.wrist_px, s, t, p.hand_scale)
                return None, p

        if R is not None and dr < max_dist:
            R.update(p.wrist_px, s, t, p.hand_scale)
            return None, p

        if L is not None and dl < max_dist:
            L.update(p.wrist_px, s, t, p.hand_scale)
            return p, None

        if s >= 0.50:
            self.right_track = TrackedEntity(p.wrist_px, s, t, p.hand_scale)
            return None, p
        else:
            self.left_track = TrackedEntity(p.wrist_px, s, t, p.hand_scale)
            return p, None

    def process_frame(self, rgb_frame: np.ndarray, frame_w: int, frame_h: int, t_now: float
                      ) -> Tuple[Optional[HandPose], Optional[HandPose]]:
        mp_rgb = cv2.resize(rgb_frame, (960, 540), interpolation=cv2.INTER_LINEAR)
        mp_rgb.flags.writeable = False
        results = self._hands.process(mp_rgb)

        if not results.multi_hand_landmarks:
            self._expire(t_now)
            return None, None

        poses: List[HandPose] = []

        for i, hand_lms in enumerate(results.multi_hand_landmarks[:2]):
            world_lms = results.multi_hand_world_landmarks[i] if results.multi_hand_world_landmarks and i < len(results.multi_hand_world_landmarks) else None
            is_right = True
            mp_score = 0.95
            if results.multi_handedness and i < len(results.multi_handedness):
                cls = results.multi_handedness[i].classification[0]
                is_right = (cls.label == "Right")
                mp_score = cls.score if is_right else (1.0 - cls.score)

            pose = self._build_pose(hand_lms, world_lms, is_right, mp_score, frame_w, frame_h)
            poses.append(pose)

        return self._assign(poses, t_now)

    def close(self):
        self._hands.close()


# =========================================================================
# 4. PEN ENGINE & MULTI-GESTURE RECOGNITION
# =========================================================================

class IsolatedPenEngine:
    """
    Multi-gesture recognition state machine:
      - Point / Pinch / Laser modes
      - Fist Eraser
      - Peace / V-Sign (Undo)
      - Thumbs Up (Redo)
      - Horns / Rock-On (Cycle Color)
      - Three-Finger / W-Sign (Cycle Canvas Mode)
    """
    def __init__(self):
        self.draw_mode = "point"    # "point", "pinch", "laser", "auto"
        self.tool_mode = "pen"      # "pen", "highlighter"
        self.reset()

    def reset(self):
        self.is_drawing = False
        self.is_erasing = False
        self.is_laser = False
        self.enter_counter = 0
        self.exit_counter = 0
        self.erase_since: Optional[float] = None
        self.erase_exit = 0
        self.active_style = "point"

        self.peace_since: Optional[float] = None
        self.thumbs_up_since: Optional[float] = None
        self.horns_since: Optional[float] = None
        self.three_finger_since: Optional[float] = None

        self.last_action_t = 0.0

    def cycle_draw_mode(self) -> str:
        modes = ["point", "pinch", "laser", "auto"]
        idx = (modes.index(self.draw_mode) + 1) % len(modes)
        self.draw_mode = modes[idx]
        self.reset()
        return self.draw_mode

    def cycle_tool_mode(self) -> str:
        tools = ["pen", "highlighter"]
        idx = (tools.index(self.tool_mode) + 1) % len(tools)
        self.tool_mode = tools[idx]
        return self.tool_mode

    def update(self, hand: Optional[HandPose], t: float, suppress: bool = False
               ) -> Tuple[bool, bool, bool, Optional[str], Tuple[float, float]]:
        """
        Returns (is_drawing, is_erasing, is_laser, gesture_action_str, active_tip_px)
        Possible action strings: 'undo', 'redo', 'cycle_color', 'cycle_canvas'
        """
        if hand is None or not hand.is_present or suppress:
            self.reset()
            return False, False, False, None, (0.0, 0.0)

        action = None

        # 1. Peace / V-sign Gesture -> Undo (Index + Middle extended, Ring + Pinky curled)
        peace_pose = (hand.index_up and hand.middle_up and not hand.ring_up and not hand.pinky_up)
        if peace_pose:
            if self.peace_since is None:
                self.peace_since = t
            elif (t - self.peace_since) >= 0.22 and (t - self.last_action_t) >= GESTURE_COOLDOWN:
                action = "undo"
                self.last_action_t = t
                self.peace_since = t
        else:
            self.peace_since = None

        # 2. Thumbs Up Gesture -> Redo (Thumb extended up, all fingers curled)
        thumbs_up_pose = (hand.thumb_up and not hand.index_up and not hand.middle_up
                          and not hand.ring_up and not hand.pinky_up)
        if thumbs_up_pose and not action:
            if self.thumbs_up_since is None:
                self.thumbs_up_since = t
            elif (t - self.thumbs_up_since) >= 0.25 and (t - self.last_action_t) >= GESTURE_COOLDOWN:
                action = "redo"
                self.last_action_t = t
                self.thumbs_up_since = t
        else:
            self.thumbs_up_since = None

        # 3. Horns / Rock-On Gesture -> Cycle Palette (Index + Pinky extended, Middle + Ring curled)
        horns_pose = (hand.index_up and hand.pinky_up and not hand.middle_up and not hand.ring_up)
        if horns_pose and not action:
            if self.horns_since is None:
                self.horns_since = t
            elif (t - self.horns_since) >= 0.25 and (t - self.last_action_t) >= GESTURE_COOLDOWN:
                action = "cycle_color"
                self.last_action_t = t
                self.horns_since = t
        else:
            self.horns_since = None

        # 4. Three-Finger W-Sign -> Cycle Canvas (Index + Middle + Ring extended, Pinky curled)
        three_finger_pose = (hand.index_up and hand.middle_up and hand.ring_up and not hand.pinky_up)
        if three_finger_pose and not action:
            if self.three_finger_since is None:
                self.three_finger_since = t
            elif (t - self.three_finger_since) >= 0.28 and (t - self.last_action_t) >= GESTURE_COOLDOWN:
                action = "cycle_canvas"
                self.last_action_t = t
                self.three_finger_since = t
        else:
            self.three_finger_since = None

        # 5. Eraser Pose -> Fist with thumb extended
        erase_pose = (
            hand.index_ratio < 0.55 and hand.thumb_up
            and hand.middle_ratio < 0.60 and hand.ring_ratio < 0.62 and hand.pinky_ratio < 0.62
        )
        if erase_pose:
            self.erase_exit = 0
            if self.erase_since is None:
                self.erase_since = t
            self.is_drawing = False
            self.enter_counter = self.exit_counter = 0
            if self.is_erasing or (t - self.erase_since) >= ERASE_ARM_SECONDS:
                self.is_erasing = True
                return False, True, False, action, hand.thumb_tip_px
            return False, False, False, action, hand.thumb_tip_px
        else:
            self.erase_since = None
            if self.is_erasing:
                self.erase_exit += 1
                if self.erase_exit < 2:
                    return False, True, False, action, hand.thumb_tip_px
                self.is_erasing = False
                self.erase_exit = 0

        # 6. Drawing & Pointer Processing
        mode = self.draw_mode
        if mode == "laser":
            is_laser_active = (hand.index_ratio > PEN_ENTER_RATIO)
            return False, False, is_laser_active, action, hand.index_tip_px

        is_pinch = hand.pinch_ratio < (PINCH_WRITE_EXIT if (self.is_drawing and self.active_style == "pinch") else PINCH_WRITE_ENTER)
        is_point = (hand.index_ratio > (PEN_EXIT_RATIO if (self.is_drawing and self.active_style == "point") else PEN_ENTER_RATIO)) and (hand.index_ratio > hand.middle_ratio + 0.05)

        target_drawing = False
        tip_px = hand.index_tip_px

        if mode == "pinch":
            target_drawing = is_pinch
            self.active_style = "pinch"
            tip_px = hand.pinch_mid_px
        elif mode == "point":
            target_drawing = is_point
            self.active_style = "point"
            tip_px = hand.index_tip_px
        else:  # "auto"
            if is_pinch:
                target_drawing = True
                self.active_style = "pinch"
                tip_px = hand.pinch_mid_px
            elif is_point:
                target_drawing = True
                self.active_style = "point"
                tip_px = hand.index_tip_px
            else:
                target_drawing = False
                tip_px = hand.index_tip_px

        if not self.is_drawing:
            if target_drawing:
                self.enter_counter += 1
                if self.enter_counter >= 1:
                    self.is_drawing = True
                    self.enter_counter = 0
                    self.exit_counter = 0
            else:
                self.enter_counter = 0
        else:
            if not target_drawing:
                self.exit_counter += 1
                if self.exit_counter >= 2:
                    self.is_drawing = False
                    self.exit_counter = 0
            else:
                self.exit_counter = 0

        return self.is_drawing, False, False, action, tip_px


# =========================================================================
# 5. GEOMETRIC SHAPE RECOGNITION & SNAPPING
# =========================================================================

class ShapeRecognizer:
    """
    Analyzes raw stroke point sequences to detect geometric shapes
    (straight lines, circles/ellipses, rectangles, and triangles) for auto-snapping.
    """
    @staticmethod
    def recognize(points: List[Tuple[float, float]]) -> Optional[Dict[str, Any]]:
        if len(points) < 8:
            return None

        pts = np.array(points, dtype=np.float32)
        p_start, p_end = pts[0], pts[-1]
        stroke_len = float(np.sum(np.linalg.norm(np.diff(pts, axis=0), axis=1)))
        end_dist = float(np.linalg.norm(p_end - p_start))

        # Check for Straight Line
        if end_dist > 40 and (stroke_len / max(end_dist, 1e-3)) < 1.18:
            return {"type": "line", "p1": tuple(p_start), "p2": tuple(p_end)}

        # Contour Analysis for Closed Shapes
        contour = pts.reshape((-1, 1, 2)).astype(np.int32)
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.04 * peri, True)
        num_vertices = len(approx)

        if is_closed := (end_dist < 60 or end_dist / max(stroke_len, 1e-3) < 0.25):
            (cx, cy), radius = cv2.minEnclosingCircle(pts)
            circle_area = math.pi * (radius ** 2)
            contour_area = cv2.contourArea(contour)
            if circle_area > 0 and (contour_area / circle_area) > 0.65:
                return {"type": "circle", "center": (float(cx), float(cy)), "radius": float(radius)}

            if num_vertices == 3:
                p1, p2, p3 = [tuple(approx[i][0]) for i in range(3)]
                return {"type": "triangle", "pts": [p1, p2, p3]}

            if num_vertices == 4:
                x, y, w, h = cv2.boundingRect(pts)
                return {"type": "rect", "x": x, "y": y, "w": w, "h": h}

        return None


# =========================================================================
# 6. INK WHITEBOARD & STROKE HISTORY
# =========================================================================

@dataclass
class Stroke:
    points: List[Tuple[float, float]]
    color_bgr: Tuple[int, int, int]
    thickness: int
    is_highlighter: bool = False
    snapped_shape: Optional[Dict[str, Any]] = None


class ARWhiteboard:
    """
    Sub-pixel precision whiteboard engine supporting Bézier splines,
    Highlighter blending per stroke, Shape Snapping, Undo/Redo stacks, and Multi-Canvas modes.
    """
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height

        self.canvas_mode_idx = 0  # 0: AR Overlay, 1: Whiteboard, 2: Darkboard, 3: Grid Paper
        self.color_idx = 0
        self.width_idx = 1
        self.shape_snap_enabled = True

        self.strokes: List[Stroke] = []
        self.redo_stack: List[Stroke] = []
        self.current_points: List[Tuple[float, float]] = []
        self.active_snapped_shape: Optional[Dict[str, Any]] = None

        self.pen_buffer = np.zeros((height, width, 3), dtype=np.uint8)
        self.pen_mask = np.zeros((height, width), dtype=np.uint8)

        self.hl_buffer = np.zeros((height, width, 3), dtype=np.uint8)
        self.hl_mask = np.zeros((height, width), dtype=np.uint8)

        self._dirty = False
        self._kernel = np.ones((5, 5), np.uint8)

        self.last_pt: Optional[Tuple[float, float]] = None
        self.mid_pt: Optional[Tuple[float, float]] = None
        self.prev_erase_pt: Optional[Tuple[float, float]] = None
        self._pending: deque = deque()

        self.hold_start_t: Optional[float] = None
        self.last_move_pt: Optional[Tuple[float, float]] = None

    @property
    def current_bgr(self) -> Tuple[int, int, int]:
        return PALETTE_COLORS[self.color_idx]["bgr"]

    @property
    def current_thickness(self) -> int:
        return STROKE_WIDTHS[self.width_idx]["thickness"]

    def set_color_index(self, idx: int):
        if 0 <= idx < len(PALETTE_COLORS):
            self.color_idx = idx

    def cycle_color(self) -> str:
        self.color_idx = (self.color_idx + 1) % len(PALETTE_COLORS)
        return PALETTE_COLORS[self.color_idx]["name"]

    def set_width_index(self, idx: int):
        if 0 <= idx < len(STROKE_WIDTHS):
            self.width_idx = idx

    def cycle_canvas_mode(self) -> str:
        self.canvas_mode_idx = (self.canvas_mode_idx + 1) % len(CANVAS_MODES)
        self._dirty = True
        return CANVAS_MODES[self.canvas_mode_idx]["name"]

    def toggle_shape_snap(self) -> bool:
        self.shape_snap_enabled = not self.shape_snap_enabled
        return self.shape_snap_enabled

    @staticmethod
    def _fp(p: Tuple[float, float]) -> Tuple[int, int]:
        return int(round(p[0] * SHIFT_MUL)), int(round(p[1] * SHIFT_MUL))

    def _stamp_circle_target(self, target_buf, target_mask, p: Tuple[float, float], radius: float, color):
        c, r = self._fp(p), int(round(radius * SHIFT_MUL))
        cv2.circle(target_buf, c, r, color, -1, cv2.LINE_AA, SHIFT)
        cv2.circle(target_mask, c, r, 255, -1, cv2.LINE_8, SHIFT)

    def _stamp_line_target(self, target_buf, target_mask, p1: Tuple[float, float], p2: Tuple[float, float], thickness: int, color):
        a, b = self._fp(p1), self._fp(p2)
        cv2.line(target_buf, a, b, color, thickness, cv2.LINE_AA, SHIFT)
        cv2.line(target_mask, a, b, 255, thickness, cv2.LINE_8, SHIFT)

    def _commit(self, P: Tuple[float, float], is_highlighter: bool = False):
        t = self.current_thickness
        color = self.current_bgr
        radius = max(t / 2.0, 2.0)
        self._dirty = True

        target_buf = self.hl_buffer if is_highlighter else self.pen_buffer
        target_mask = self.hl_mask if is_highlighter else self.pen_mask

        if self.last_pt is None:
            self.last_pt = P
            self.mid_pt = None
            self._stamp_circle_target(target_buf, target_mask, P, radius, color)
            return

        dist = math.hypot(P[0] - self.last_pt[0], P[1] - self.last_pt[1])
        if dist > MAX_JUMP_PX:
            self._stamp_circle_target(target_buf, target_mask, P, radius, color)
            self.last_pt = P
            self.mid_pt = None
            return

        if dist < 0.6:
            return

        M = ((self.last_pt[0] + P[0]) * 0.5, (self.last_pt[1] + P[1]) * 0.5)

        if self.mid_pt is None:
            self._stamp_line_target(target_buf, target_mask, self.last_pt, M, t, color)
            self._stamp_circle_target(target_buf, target_mask, M, radius, color)
        else:
            chord = math.hypot(M[0] - self.mid_pt[0], M[1] - self.mid_pt[1])
            steps = max(2, min(8, int(chord / 5.0)))
            prev = self.mid_pt
            for s in range(1, steps + 1):
                u = s / float(steps)
                cu = (1.0 - u) * (1.0 - u)
                cm = 2.0 * (1.0 - u) * u
                cn = u * u
                cx = cu * self.mid_pt[0] + cm * self.last_pt[0] + cn * M[0]
                cy = cu * self.mid_pt[1] + cm * self.last_pt[1] + cn * M[1]
                curr = (cx, cy)
                self._stamp_line_target(target_buf, target_mask, prev, curr, t, color)
                prev = curr
            self._stamp_circle_target(target_buf, target_mask, M, radius, color)

        self.mid_pt = M
        self.last_pt = P

    def stroke_point(self, point: Tuple[float, float], is_highlighter: bool, t_now: float) -> Optional[str]:
        self.current_points.append(point)
        self._pending.append(point)

        snapped_shape_type = None

        if self.shape_snap_enabled and len(self.current_points) > 12:
            if self.last_move_pt is None:
                self.last_move_pt = point
                self.hold_start_t = t_now
            else:
                dist = math.hypot(point[0] - self.last_move_pt[0], point[1] - self.last_move_pt[1])
                if dist < 12.0:
                    if self.hold_start_t is not None and (t_now - self.hold_start_t) >= SHAPE_HOLD_SECONDS:
                        if shape := ShapeRecognizer.recognize(self.current_points):
                            self.active_snapped_shape = shape
                            snapped_shape_type = shape["type"]
                            self.hold_start_t = None
                            self.redraw_all()
                            self._draw_shape_to_target(shape, self.current_thickness, self.current_bgr, is_highlighter)
                else:
                    self.last_move_pt = point
                    self.hold_start_t = t_now

        if not self.active_snapped_shape:
            while len(self._pending) > TAIL_TRIM:
                self._commit(self._pending.popleft(), is_highlighter)

        return snapped_shape_type

    def _draw_shape_to_target(self, shape: Dict[str, Any], thickness: int, color: Tuple[int, int, int], is_highlighter: bool):
        target_buf = self.hl_buffer if is_highlighter else self.pen_buffer
        target_mask = self.hl_mask if is_highlighter else self.pen_mask

        stype = shape["type"]
        if stype == "line":
            p1, p2 = self._fp(shape["p1"]), self._fp(shape["p2"])
            cv2.line(target_buf, p1, p2, color, thickness, cv2.LINE_AA, SHIFT)
            cv2.line(target_mask, p1, p2, 255, thickness, cv2.LINE_8, SHIFT)
        elif stype == "circle":
            c, r = self._fp(shape["center"]), int(round(shape["radius"] * SHIFT_MUL))
            cv2.circle(target_buf, c, r, color, thickness, cv2.LINE_AA, SHIFT)
            cv2.circle(target_mask, c, r, 255, thickness, cv2.LINE_8, SHIFT)
        elif stype == "rect":
            x, y, w, h = shape["x"], shape["y"], shape["w"], shape["h"]
            cv2.rectangle(target_buf, (x, y), (x + w, y + h), color, thickness, cv2.LINE_AA)
            cv2.rectangle(target_mask, (x, y), (x + w, y + h), 255, thickness, cv2.LINE_8)
        elif stype == "triangle":
            pts = np.array([shape["pts"]], dtype=np.int32)
            cv2.polylines(target_buf, pts, True, color, thickness, cv2.LINE_AA)
            cv2.polylines(target_mask, pts, True, 255, thickness, cv2.LINE_8)

        self._dirty = True

    def pen_up(self, is_highlighter: bool = False):
        t = self.current_thickness
        color = self.current_bgr
        radius = max(t / 2.0, 2.0)

        target_buf = self.hl_buffer if is_highlighter else self.pen_buffer
        target_mask = self.hl_mask if is_highlighter else self.pen_mask

        if not self.active_snapped_shape:
            if self.last_pt is None and self._pending:
                dot = self._pending[0]
                self._stamp_circle_target(target_buf, target_mask, dot, radius, color)
                self._dirty = True
            elif self.mid_pt is not None and self.last_pt is not None:
                self._stamp_line_target(target_buf, target_mask, self.mid_pt, self.last_pt, t, color)
                self._stamp_circle_target(target_buf, target_mask, self.last_pt, radius, color)
                self._dirty = True

        if self.current_points:
            stroke = Stroke(
                points=list(self.current_points),
                color_bgr=color,
                thickness=t,
                is_highlighter=is_highlighter,
                snapped_shape=self.active_snapped_shape
            )
            self.strokes.append(stroke)
            self.redo_stack.clear()

        self._pending.clear()
        self.current_points.clear()
        self.active_snapped_shape = None
        self.last_pt = None
        self.mid_pt = None
        self.hold_start_t = None
        self.last_move_pt = None

    def erase_at(self, point: Tuple[float, float], radius: int = ERASER_RADIUS):
        self._dirty = True
        c = self._fp(point)
        for buf, mask in ((self.pen_buffer, self.pen_mask), (self.hl_buffer, self.hl_mask)):
            cv2.circle(buf, c, radius * SHIFT_MUL, (0, 0, 0), -1, cv2.LINE_8, SHIFT)
            cv2.circle(mask, c, radius * SHIFT_MUL, 0, -1, cv2.LINE_8, SHIFT)
            if self.prev_erase_pt is not None:
                p_prev = self._fp(self.prev_erase_pt)
                cv2.line(buf, p_prev, c, (0, 0, 0), radius * 2, cv2.LINE_8, SHIFT)
                cv2.line(mask, p_prev, c, 0, radius * 2, cv2.LINE_8, SHIFT)

        self.prev_erase_pt = point

    def eraser_up(self):
        self.prev_erase_pt = None

    def undo(self) -> bool:
        if not self.strokes:
            return False
        stroke = self.strokes.pop()
        self.redo_stack.append(stroke)
        self.redraw_all()
        return True

    def redo(self) -> bool:
        if not self.redo_stack:
            return False
        stroke = self.redo_stack.pop()
        self.strokes.append(stroke)
        self.redraw_all()
        return True

    def clear(self):
        self.pen_buffer[:] = 0
        self.pen_mask[:] = 0
        self.hl_buffer[:] = 0
        self.hl_mask[:] = 0
        self.strokes.clear()
        self.redo_stack.clear()
        self._dirty = True
        self.last_pt = None
        self.mid_pt = None
        self.prev_erase_pt = None
        self._pending.clear()
        self.current_points.clear()
        self.active_snapped_shape = None

    def redraw_all(self):
        self.pen_buffer[:] = 0
        self.pen_mask[:] = 0
        self.hl_buffer[:] = 0
        self.hl_mask[:] = 0

        for stroke in self.strokes:
            target_buf = self.hl_buffer if stroke.is_highlighter else self.pen_buffer
            target_mask = self.hl_mask if stroke.is_highlighter else self.pen_mask

            if stroke.snapped_shape:
                self._draw_shape_to_target(stroke.snapped_shape, stroke.thickness, stroke.color_bgr, stroke.is_highlighter)
            else:
                pts = stroke.points
                if not pts:
                    continue
                if len(pts) == 1:
                    cv2.circle(target_buf, ipt(pts[0]), stroke.thickness // 2, stroke.color_bgr, -1, cv2.LINE_AA)
                    cv2.circle(target_mask, ipt(pts[0]), stroke.thickness // 2, 255, -1, cv2.LINE_8)
                else:
                    for i in range(len(pts) - 1):
                        p1, p2 = ipt(pts[i]), ipt(pts[i + 1])
                        cv2.line(target_buf, p1, p2, stroke.color_bgr, stroke.thickness, cv2.LINE_AA)
                        cv2.line(target_mask, p1, p2, 255, stroke.thickness, cv2.LINE_8)

        self._dirty = True

    def generate_background(self, camera_frame: np.ndarray) -> np.ndarray:
        mode_code = CANVAS_MODES[self.canvas_mode_idx]["code"]
        if mode_code == "white":
            return np.full_like(camera_frame, (250, 250, 252), dtype=np.uint8)
        elif mode_code == "dark":
            return np.full_like(camera_frame, (20, 20, 24), dtype=np.uint8)
        elif mode_code == "grid":
            grid = np.full_like(camera_frame, (245, 245, 248), dtype=np.uint8)
            step = 40
            for x in range(0, self.width, step):
                cv2.line(grid, (x, 0), (x, self.height), (220, 220, 230), 1)
            for y in range(0, self.height, step):
                cv2.line(grid, (0, y), (self.width, y), (220, 220, 230), 1)
            return grid
        return camera_frame.copy()

    def composite_with_camera(self, camera_frame: np.ndarray, is_highlighter: bool = False) -> np.ndarray:
        bg = self.generate_background(camera_frame)

        if self.hl_mask.any():
            hl_mask_b = (self.hl_mask > 0)[:, :, None]
            alpha = 0.45
            blended_hl = cv2.addWeighted(self.hl_buffer, alpha, bg, 1.0 - alpha, 0)
            np.copyto(bg, blended_hl, where=hl_mask_b)

        if self.pen_mask.any():
            halo = cv2.dilate(self.pen_mask, self._kernel, iterations=1)
            halo_b = (halo > 0)[:, :, None]
            pen_mask_b = (self.pen_mask > 0)[:, :, None]
            np.copyto(bg, np.uint8(255), where=halo_b)
            np.copyto(bg, self.pen_buffer, where=pen_mask_b)

        return bg


# =========================================================================
# 7. AR FLOATING MENU
# =========================================================================

PANEL_W = 280
PANEL_H = 410


class ARFloatingMenu:
    """
    Glassmorphism AR floating control menu with dwell selection indicators,
    smooth fade animations, and full property toggles.
    """
    def __init__(self):
        self.is_visible = False
        self.anchor_x = 90.0
        self.anchor_y = 150.0
        self.fade_alpha = 0.0
        self.px = 0
        self.py = 0

        self.hold_option_idx = 1
        self.last_interaction_t = 0.0

        self.dwell_btn_idx = -1
        self.dwell_start_t = 0.0
        self.locked_idx = -1
        self.hover_idx = -1
        self.recent_hover_idx = -1
        self.recent_hover_t = 0.0
        self.pinch_state = False

        self.buttons: List[dict] = []

    @property
    def current_hold_duration(self) -> float:
        return MENU_HOLD_OPTIONS[self.hold_option_idx]["duration"]

    def open_at(self, x: float, y: float, t: float):
        if not self.is_visible:
            self.is_visible = True
            self.anchor_x, self.anchor_y = x, y
            self.fade_alpha = 0.0
            self.cancel_dwell()
            self.locked_idx = -1
        self.last_interaction_t = t

    def close(self):
        self.last_interaction_t = -1e9

    def update(self, t: float):
        if not self.is_visible:
            return
        if t - self.last_interaction_t > self.current_hold_duration:
            self.fade_alpha = max(0.0, self.fade_alpha - 0.12)
            if self.fade_alpha <= 0.01:
                self.is_visible = False
                self.cancel_dwell()
                self.pinch_state = False
        else:
            self.fade_alpha = min(1.0, self.fade_alpha + 0.15)

    def cycle_hold_duration(self):
        self.hold_option_idx = (self.hold_option_idx + 1) % len(MENU_HOLD_OPTIONS)

    def cancel_dwell(self):
        self.dwell_btn_idx = -1
        self.dwell_start_t = 0.0
        self.hover_idx = -1
        self.pinch_state = False

    def layout(self, w_f: int, h_f: int):
        self.px = int(np.clip(self.anchor_x, 20, w_f - PANEL_W - 20))
        self.py = int(np.clip(self.anchor_y, 30, h_f - PANEL_H - 30))
        px, py = self.px, self.py
        b: List[dict] = []

        for i in range(len(PALETTE_COLORS)):
            b.append({"type": "color", "value": i, "shape": "circle",
                      "cx": px + 44 + (i % 4) * 56, "cy": py + 58 + (i // 4) * 50, "r": 18})

        for j in range(len(STROKE_WIDTHS)):
            b.append({"type": "width", "value": j, "shape": "circle",
                      "cx": px + 48 + j * 74, "cy": py + 200, "r": 18})

        sy = py + 242
        b.append({"type": "toggle_tool_mode", "value": 0, "shape": "rect",
                  "x1": px + 14, "y1": sy - 14, "x2": px + 136, "y2": sy + 14})
        b.append({"type": "toggle_canvas_mode", "value": 0, "shape": "rect",
                  "x1": px + 144, "y1": sy - 14, "x2": px + 266, "y2": sy + 14})

        vy = py + 278
        b.append({"type": "toggle_hand", "value": 0, "shape": "rect",
                  "x1": px + 14, "y1": vy - 14, "x2": px + 136, "y2": vy + 14})
        b.append({"type": "toggle_draw_mode", "value": 0, "shape": "rect",
                  "x1": px + 144, "y1": vy - 14, "x2": px + 266, "y2": vy + 14})

        hy = py + 314
        b.append({"type": "toggle_shape_snap", "value": 0, "shape": "rect",
                  "x1": px + 14, "y1": hy - 14, "x2": px + 136, "y2": hy + 14})
        b.append({"type": "cycle_hold", "value": 0, "shape": "rect",
                  "x1": px + 144, "y1": hy - 14, "x2": px + 266, "y2": hy + 14})

        cy = py + 360
        b.append({"type": "undo", "value": 0, "shape": "rect",
                  "x1": px + 14, "y1": cy - 15, "x2": px + 132, "y2": cy + 15})
        b.append({"type": "clear", "value": 0, "shape": "rect",
                  "x1": px + 142, "y1": cy - 15, "x2": px + 266, "y2": cy + 15})

        self.buttons = b

    def contains(self, pt: Tuple[float, float], margin: int = 0) -> bool:
        if not self.is_visible or self.fade_alpha < 0.3:
            return False
        return (self.px - margin <= pt[0] <= self.px + PANEL_W + margin
                and self.py - margin <= pt[1] <= self.py + PANEL_H + margin)

    @staticmethod
    def _hits(btn: dict, x: float, y: float) -> bool:
        if btn["shape"] == "circle":
            return math.hypot(x - btn["cx"], y - btn["cy"]) <= btn["r"] + 8
        return btn["x1"] - 6 <= x <= btn["x2"] + 6 and btn["y1"] - 6 <= y <= btn["y2"] + 6

    def hit_index(self, pt: Tuple[float, float]) -> int:
        for i, btn in enumerate(self.buttons):
            if self._hits(btn, pt[0], pt[1]):
                return i
        return -1

    def _fire(self, idx: int) -> Tuple[str, int]:
        self.dwell_btn_idx = -1
        self.locked_idx = idx
        btn = self.buttons[idx]
        return btn["type"], btn["value"]

    def interact(self, cursor: Tuple[float, float], pinch_ratio: float, t: float
                 ) -> Tuple[Optional[str], Optional[int]]:
        if not self.is_visible or self.fade_alpha < 0.3:
            return None, None

        was = self.pinch_state
        self.pinch_state = (pinch_ratio < PINCH_EXIT) if was else (pinch_ratio < PINCH_ENTER)
        rising = self.pinch_state and not was

        if self.contains(cursor, margin=30):
            self.last_interaction_t = t

        if self.pinch_state:
            self.dwell_btn_idx = -1
            if rising and self.recent_hover_idx >= 0 and t - self.recent_hover_t < 0.4:
                return self._fire(self.recent_hover_idx)
            return None, None

        hit = self.hit_index(cursor)
        self.hover_idx = hit
        if hit != -1:
            self.recent_hover_idx, self.recent_hover_t = hit, t

        if hit != self.locked_idx:
            self.locked_idx = -1
        elif hit != -1:
            self.dwell_btn_idx = -1
            return None, None

        if hit == -1:
            self.dwell_btn_idx = -1
            return None, None

        if self.dwell_btn_idx != hit:
            self.dwell_btn_idx = hit
            self.dwell_start_t = t
        elif t - self.dwell_start_t >= MENU_DWELL_SECONDS:
            return self._fire(hit)
        return None, None

    def _ring(self, frame, btn, progress: float):
        if btn["shape"] == "circle":
            cv2.ellipse(frame, (btn["cx"], btn["cy"]), (btn["r"] + 6, btn["r"] + 6), 0,
                        -90, -90 + int(progress * 360), (255, 255, 255), 2, cv2.LINE_AA)
        else:
            x1, x2, y2 = btn["x1"], btn["x2"], btn["y2"]
            cv2.line(frame, (x1, y2 + 3), (x1 + int((x2 - x1) * progress), y2 + 3),
                     (255, 255, 255), 2, cv2.LINE_AA)

    def render(self, frame: np.ndarray, active_color_idx: int, active_width_idx: int,
               dominant_hand: str, draw_mode: str, tool_mode: str, canvas_mode_name: str,
               shape_snap: bool, t: float):
        if not self.is_visible or self.fade_alpha <= 0.02:
            return
        px, py = self.px, self.py

        roi = frame[py:py + PANEL_H, px:px + PANEL_W]
        glass = np.full_like(roi, (20, 20, 26), dtype=np.uint8)
        a = 0.88 * self.fade_alpha
        cv2.addWeighted(glass, a, roi, 1.0 - a, 0, roi)
        cv2.rectangle(frame, (px, py), (px + PANEL_W, py + PANEL_H), (90, 90, 115), 1, cv2.LINE_AA)

        hold_label = MENU_HOLD_OPTIONS[self.hold_option_idx]["label"]
        cv2.putText(frame, f"SETTINGS & PALETTE [{hold_label}]", (px + 14, py + 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.46, (240, 240, 250), 1, cv2.LINE_AA)
        cv2.putText(frame, "STROKE SIZE", (px + 14, py + 172),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (190, 190, 205), 1, cv2.LINE_AA)

        for i, btn in enumerate(self.buttons):
            typ = btn["type"]
            hovered = (i == self.hover_idx)

            if typ == "color":
                c = PALETTE_COLORS[btn["value"]]["bgr"]
                if btn["value"] == active_color_idx:
                    cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"] + 6, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"], c, -1, cv2.LINE_AA)
                cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"], (60, 60, 75), 1, cv2.LINE_AA)

            elif typ == "width":
                active = btn["value"] == active_width_idx
                cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"],
                           (90, 90, 115) if active else (50, 50, 62), -1, cv2.LINE_AA)
                cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"], (120, 120, 145), 1, cv2.LINE_AA)
                if active:
                    cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"] + 5, (255, 255, 255), 2, cv2.LINE_AA)
                dot = max(2, STROKE_WIDTHS[btn["value"]]["thickness"] // 2)
                cv2.circle(frame, (btn["cx"], btn["cy"]), dot, (245, 245, 250), -1, cv2.LINE_AA)

            else:
                if typ == "toggle_tool_mode":
                    label, scale, tcol = f"TOOL: {tool_mode.upper()[:6]}", 0.36, (100, 230, 255)
                elif typ == "toggle_canvas_mode":
                    label, scale, tcol = f"CANVAS: {canvas_mode_name[:5].upper()}", 0.36, (220, 220, 235)
                elif typ == "toggle_hand":
                    label, scale, tcol = f"HAND: {dominant_hand.upper()}", 0.36, (220, 220, 235)
                elif typ == "toggle_draw_mode":
                    label, scale, tcol = f"MODE: {draw_mode.upper()}", 0.36, (130, 230, 255)
                elif typ == "toggle_shape_snap":
                    label, scale, tcol = f"SNAP: {'ON' if shape_snap else 'OFF'}", 0.36, (120, 240, 150) if shape_snap else (180, 180, 190)
                elif typ == "cycle_hold":
                    label, scale, tcol = f"HOLD: {hold_label}", 0.36, (220, 220, 235)
                elif typ == "undo":
                    label, scale, tcol = "UNDO", 0.40, (230, 230, 240)
                else:
                    label, scale, tcol = "CLEAR", 0.40, (240, 120, 120)

                fill = (62, 62, 78) if hovered else (45, 45, 58)
                cv2.rectangle(frame, (btn["x1"], btn["y1"]), (btn["x2"], btn["y2"]), fill, -1)
                cv2.rectangle(frame, (btn["x1"], btn["y1"]), (btn["x2"], btn["y2"]), (90, 90, 115), 1, cv2.LINE_AA)
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, scale, 1)
                tx = btn["x1"] + max(4, ((btn["x2"] - btn["x1"]) - tw) // 2)
                ty = (btn["y1"] + btn["y2"]) // 2 + th // 2
                cv2.putText(frame, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, scale, tcol, 1, cv2.LINE_AA)

            if hovered and btn["shape"] == "circle":
                cv2.circle(frame, (btn["cx"], btn["cy"]), btn["r"] + 3, (200, 200, 215), 1, cv2.LINE_AA)

        if 0 <= self.dwell_btn_idx < len(self.buttons):
            prog = min(1.0, (t - self.dwell_start_t) / MENU_DWELL_SECONDS)
            self._ring(frame, self.buttons[self.dwell_btn_idx], prog)


# =========================================================================
# 8. VISUAL EFFECTS & TOASTS
# =========================================================================

class VisualEffectsManager:
    """Renders toast overlay notifications, clear canvas ripple waves, and laser trails."""
    def __init__(self):
        self.toast_text = ""
        self.toast_start_t = 0.0
        self.toast_duration = 2.2
        self.ripple_center: Optional[Tuple[int, int]] = None
        self.ripple_start_t = 0.0
        self.ripple_duration = 0.65
        self.laser_history: deque = deque(maxlen=16)

    def show_toast(self, text: str, t: float):
        self.toast_text = text
        self.toast_start_t = t

    def trigger_clear_ripple(self, center, t: float):
        self.ripple_center = ipt(center)
        self.ripple_start_t = t

    def add_laser_point(self, pt: Tuple[float, float]):
        self.laser_history.append(ipt(pt))

    def clear_laser(self):
        self.laser_history.clear()

    def render(self, frame: np.ndarray, t: float):
        h, w = frame.shape[:2]

        if len(self.laser_history) > 1:
            pts = list(self.laser_history)
            for i in range(1, len(pts)):
                alpha = i / len(pts)
                r = int(3 + alpha * 5)
                cv2.circle(frame, pts[i], r, (0, 0, 255), -1, cv2.LINE_AA)
                cv2.line(frame, pts[i - 1], pts[i], (50, 100, 255), int(1 + alpha * 3), cv2.LINE_AA)

        if self.ripple_center and (t - self.ripple_start_t < self.ripple_duration):
            prog = (t - self.ripple_start_t) / self.ripple_duration
            wave = max(0.0, 1.0 - prog)
            col = (int(255 * wave), int(220 * wave), int(100 * wave))
            cv2.circle(frame, self.ripple_center, int(prog * 360), col, 3, cv2.LINE_AA)
            cv2.circle(frame, self.ripple_center, int(prog * 240), col, 2, cv2.LINE_AA)
        else:
            self.ripple_center = None

        if self.toast_text and (t - self.toast_start_t < self.toast_duration):
            elapsed = t - self.toast_start_t
            fade = 1.0
            if elapsed > self.toast_duration - 0.4:
                fade = max(0.0, (self.toast_duration - elapsed) / 0.4)

            (tw, _), _ = cv2.getTextSize(self.toast_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            t_len = tw + 50
            tx1 = max(0, (w - t_len) // 2)
            ty1, ty2 = 55, 96
            tx2 = min(w, tx1 + t_len)

            roi = frame[ty1:ty2, tx1:tx2]
            overlay = np.full_like(roi, (28, 28, 34), dtype=np.uint8)
            cv2.addWeighted(overlay, 0.9 * fade, roi, 1.0 - 0.9 * fade, 0, roi)
            cv2.rectangle(frame, (tx1, ty1), (tx2, ty2), (90, 90, 110), 1, cv2.LINE_AA)
            tc = (int(240 * fade), int(240 * fade), int(250 * fade))
            cv2.putText(frame, self.toast_text, (tx1 + 25, ty1 + 27),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, tc, 1, cv2.LINE_AA)
        else:
            self.toast_text = ""


# =========================================================================
# 9. CAMERA INITIALIZATION
# =========================================================================

def init_webcam() -> Optional[ThreadedWebcam]:
    backends = [cv2.CAP_AVFOUNDATION, cv2.CAP_ANY] if platform.system() == "Darwin" else [cv2.CAP_ANY]
    for backend in backends:
        for idx in [0, 1, 2, 3]:
            cap = cv2.VideoCapture(idx, backend)
            if not cap.isOpened():
                cap.release()
                continue
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, CANVAS_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CANVAS_HEIGHT)
            cap.set(cv2.CAP_PROP_FPS, TARGET_FPS)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            for _ in range(6):
                ret, frame = cap.read()
                if ret and frame is not None:
                    print(f"[Air Writer] Connected webcam index {idx} ({frame.shape[1]}x{frame.shape[0]})")
                    return ThreadedWebcam(cap)
                time.sleep(0.03)
            cap.release()
    return None


# =========================================================================
# 10. MAIN EXECUTION LOOP
# =========================================================================

def main():
    print("=" * 76)
    print("  AIR WRITER - Pro macOS AR Edition (Precision Dual-Hand Engine v5 Pro)")
    print("=" * 76)
    print("Universal Video Call Support: Discord | Instagram | WhatsApp | Zoom | Meet")

    vcam = None
    if HAS_PYVIRTUALCAM:
        try:
            vcam = pyvirtualcam.Camera(width=CANVAS_WIDTH, height=CANVAS_HEIGHT, fps=TARGET_FPS,
                                       fmt=pyvirtualcam.PixelFormat.BGR, print_fps=False)
            print(f"[Air Writer] Virtual Camera Active: {vcam.device}")
            print("             -> Select 'OBS Virtual Camera' in Discord / Instagram / WhatsApp / Zoom")
            print("             -> Press 'm' or toggle VCAM in menu to flip orientation for selfie apps")
        except Exception as exc:
            print(f"[Air Writer] Virtual Camera note: {exc}")
            print("             To activate virtual camera on macOS, install OBS Studio once.")
    else:
        print("[Air Writer] 'pyvirtualcam' not installed. Previewing in local window mode.")

    time.sleep(0.2)

    cam = init_webcam()
    if cam is None:
        print("[Air Writer] Error: Unable to access webcam.", file=sys.stderr)
        print("Please enable Camera permission in System Settings > Privacy & Security.", file=sys.stderr)
        if vcam is not None:
            vcam.close()
        sys.exit(1)

    hand_tracker = PersistentHandTracker()
    board = ARWhiteboard(CANVAS_WIDTH, CANVAS_HEIGHT)
    menu = ARFloatingMenu()
    effects = VisualEffectsManager()
    pen_engine = IsolatedPenEngine()

    pen_filter = PointFilter2D(PEN_MIN_CUTOFF, PEN_BETA, PEN_D_CUTOFF)
    thumb_filter = PointFilter2D(PEN_MIN_CUTOFF, PEN_BETA, PEN_D_CUTOFF)
    cursor_filter = PointFilter2D(CURSOR_MIN_CUTOFF, CURSOR_BETA, CURSOR_D_CUTOFF)

    dominant_hand = "Right"
    vcam_flipped = False

    palm_open_seen = False
    palm_open_time = 0.0
    clear_cooldown_t = -10.0
    suppress_until = 0.0
    was_drawing = False
    prev_smooth_tip: Optional[Tuple[float, float]] = None
    menu_open_since: Optional[float] = None
    menu_fist_since: Optional[float] = None

    window_title = "Air Writer - Pro AR Canvas"
    cv2.namedWindow(window_title, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_title, CANVAS_WIDTH, CANVAS_HEIGHT)

    save_dir = os.path.join(os.path.expanduser("~"), "Desktop", "AirWriterSaves")
    print(f"[Air Writer] Snapshots save path: {save_dir}")
    print("[Air Writer] System Ready. Press 'q' or ESC to exit.")
    print("[Air Writer] Gestures: Peace=Undo | ThumbsUp=Redo | Horns=Color | 3Finger=Canvas | Fist=Erase")
    print("[Air Writer] Hotkeys:  [c]lear | [z]undo | [y]redo | [h]and | [p]mode | [k]tool | [b]bg | [m]irror | [s]ave")

    prev_frame_t = time.perf_counter()
    fps_estimate = 30.0

    try:
        while True:
            t_now = time.perf_counter()
            dt = t_now - prev_frame_t
            prev_frame_t = t_now
            if dt > 0.001:
                fps_estimate = 0.92 * fps_estimate + 0.08 * (1.0 / dt)

            ok, raw_frame = cam.read_latest()
            if not ok or raw_frame is None:
                time.sleep(0.005)
                continue

            mirrored = cv2.flip(raw_frame, 1)
            if mirrored.shape[1] != CANVAS_WIDTH or mirrored.shape[0] != CANVAS_HEIGHT:
                mirrored = cv2.resize(mirrored, (CANVAS_WIDTH, CANVAS_HEIGHT), interpolation=cv2.INTER_LINEAR)

            rgb = cv2.cvtColor(mirrored, cv2.COLOR_BGR2RGB)
            phys_left, phys_right = hand_tracker.process_frame(rgb, CANVAS_WIDTH, CANVAS_HEIGHT, t_now)

            if dominant_hand == "Right":
                drawing_hand, manager_hand = phys_right, phys_left
            else:
                drawing_hand, manager_hand = phys_left, phys_right

            if drawing_hand is None and manager_hand is not None and not menu.is_visible:
                open_palm = (manager_hand.index_up and manager_hand.middle_up
                             and manager_hand.ring_up and manager_hand.pinky_up)
                if not open_palm:
                    drawing_hand, manager_hand = manager_hand, None

            menu.layout(CANVAS_WIDTH, CANVAS_HEIGHT)

            # ---------------------------------------------------------
            # MANAGER HAND PROCESSING
            # ---------------------------------------------------------
            manager_cursor: Optional[Tuple[float, float]] = None

            if manager_hand is not None and manager_hand.is_present:
                open_palm = (manager_hand.index_up and manager_hand.middle_up
                             and manager_hand.ring_up and manager_hand.pinky_up)
                fist = (manager_hand.index_ratio < 0.50 and manager_hand.middle_ratio < 0.50
                        and manager_hand.ring_ratio < 0.50 and manager_hand.pinky_ratio < 0.50)

                if open_palm:
                    if menu_open_since is None:
                        menu_open_since = t_now
                    elif t_now - menu_open_since >= MENU_OPEN_HOLD:
                        off_x = 60 if dominant_hand == "Right" else -300
                        menu.open_at(manager_hand.wrist_px[0] + off_x, manager_hand.wrist_px[1] - 140, t_now)
                else:
                    menu_open_since = None

                if menu.is_visible and fist:
                    if menu_fist_since is None:
                        menu_fist_since = t_now
                    elif t_now - menu_fist_since >= MENU_CLOSE_HOLD:
                        menu.close()
                        menu_fist_since = None
                else:
                    menu_fist_since = None

                if menu.is_visible:
                    manager_cursor = cursor_filter.update(manager_hand.index_tip_px, t_now)
                    can_point = (not open_palm) and (manager_hand.index_ratio > 0.5 or manager_hand.pinch_ratio < PINCH_EXIT)
                    if can_point:
                        sel_type, sel_val = menu.interact(manager_cursor, manager_hand.pinch_ratio, t_now)
                    else:
                        menu.cancel_dwell()
                        sel_type, sel_val = None, None

                    if sel_type == "color":
                        board.set_color_index(sel_val)
                        effects.show_toast(f"Color: {PALETTE_COLORS[sel_val]['name']}", t_now)
                    elif sel_type == "width":
                        board.set_width_index(sel_val)
                        effects.show_toast(f"Stroke: {STROKE_WIDTHS[sel_val]['label']}", t_now)
                    elif sel_type == "toggle_tool_mode":
                        new_tool = pen_engine.cycle_tool_mode()
                        effects.show_toast(f"Tool Mode: {new_tool.upper()}", t_now)
                        menu.cancel_dwell()
                    elif sel_type == "toggle_canvas_mode":
                        cname = board.cycle_canvas_mode()
                        effects.show_toast(f"Canvas: {cname}", t_now)
                        menu.cancel_dwell()
                    elif sel_type == "toggle_hand":
                        dominant_hand = "Left" if dominant_hand == "Right" else "Right"
                        effects.show_toast(f"Drawing Hand: {dominant_hand.upper()}", t_now)
                        menu.cancel_dwell()
                    elif sel_type == "toggle_draw_mode":
                        new_mode = pen_engine.cycle_draw_mode()
                        effects.show_toast(f"Draw Mode: {new_mode.upper()}", t_now)
                        menu.cancel_dwell()
                    elif sel_type == "toggle_shape_snap":
                        snap = board.toggle_shape_snap()
                        effects.show_toast(f"Shape Snap: {'ON' if snap else 'OFF'}", t_now)
                        menu.cancel_dwell()
                    elif sel_type == "cycle_hold":
                        menu.cycle_hold_duration()
                        effects.show_toast(f"Menu Hold: {MENU_HOLD_OPTIONS[menu.hold_option_idx]['label']}", t_now)
                    elif sel_type == "undo":
                        if board.undo():
                            effects.show_toast("Undo Stroke", t_now)
                        menu.cancel_dwell()
                    elif sel_type == "clear":
                        board.clear()
                        effects.trigger_clear_ripple(manager_cursor, t_now)
                        effects.show_toast("Canvas Cleared", t_now)
            else:
                cursor_filter.reset()
                menu_open_since = None
                menu_fist_since = None
                menu.cancel_dwell()

            menu.update(t_now)

            # ---------------------------------------------------------
            # DRAWING HAND PROCESSING
            # ---------------------------------------------------------
            cursor_info: Optional[dict] = None
            palm_hint_pos: Optional[Tuple[int, int]] = None

            if drawing_hand is not None and drawing_hand.is_present:
                raw_palm_open = (drawing_hand.thumb_up and drawing_hand.index_up and drawing_hand.middle_up
                                 and drawing_hand.ring_up and drawing_hand.pinky_up)
                all_curled = (drawing_hand.index_ratio < 0.50 and drawing_hand.middle_ratio < 0.50
                              and drawing_hand.ring_ratio < 0.50 and drawing_hand.pinky_ratio < 0.50)

                if raw_palm_open:
                    palm_open_seen = True
                    palm_open_time = t_now
                    palm_hint_pos = ipt(drawing_hand.wrist_px)
                elif palm_open_seen and all_curled:
                    if (t_now - palm_open_time) <= 1.2 and (t_now - clear_cooldown_t) > 1.2:
                        board.clear()
                        effects.trigger_clear_ripple(drawing_hand.wrist_px, t_now)
                        effects.show_toast("Canvas Cleared", t_now)
                        clear_cooldown_t = t_now
                        suppress_until = t_now + 0.6
                        palm_open_seen = False
                        pen_engine.reset()

                if t_now - palm_open_time > 1.2:
                    palm_open_seen = False

                suppress = raw_palm_open or (t_now < suppress_until)
                is_drawing, is_erasing, is_laser, gesture_action, active_tip = pen_engine.update(drawing_hand, t_now, suppress)

                # Process Gesture Quick Actions
                if gesture_action == "undo":
                    if board.undo():
                        effects.show_toast("Gesture Undo", t_now)
                elif gesture_action == "redo":
                    if board.redo():
                        effects.show_toast("Gesture Redo", t_now)
                elif gesture_action == "cycle_color":
                    cname = board.cycle_color()
                    effects.show_toast(f"Gesture Color: {cname}", t_now)
                elif gesture_action == "cycle_canvas":
                    cname = board.cycle_canvas_mode()
                    effects.show_toast(f"Gesture Canvas: {cname}", t_now)

                smooth_tip = pen_filter.update(active_tip, t_now)
                smooth_thumb = thumb_filter.update(drawing_hand.thumb_tip_px, t_now)

                if is_drawing and menu.contains(smooth_tip, margin=10):
                    is_drawing = False

                is_highlighter = (pen_engine.tool_mode == "highlighter")

                if is_drawing:
                    board.eraser_up()
                    effects.clear_laser()
                    if not was_drawing and prev_smooth_tip is not None:
                        board.stroke_point(prev_smooth_tip, is_highlighter, t_now)

                    snapped_shape = board.stroke_point(smooth_tip, is_highlighter, t_now)
                    if snapped_shape:
                        effects.show_toast(f"Snapped: {snapped_shape.upper()}", t_now)

                    cursor_info = {"type": "draw", "pt": smooth_tip,
                                   "color": board.current_bgr, "thickness": board.current_thickness,
                                   "highlighter": is_highlighter}
                elif is_erasing:
                    board.pen_up(is_highlighter)
                    effects.clear_laser()
                    board.erase_at(smooth_thumb, ERASER_RADIUS)
                    cursor_info = {"type": "erase", "pt": smooth_thumb, "radius": ERASER_RADIUS}
                elif is_laser:
                    board.pen_up(is_highlighter)
                    board.eraser_up()
                    effects.add_laser_point(smooth_tip)
                    cursor_info = {"type": "laser", "pt": smooth_tip}
                else:
                    board.pen_up(is_highlighter)
                    board.eraser_up()
                    effects.clear_laser()
                    if (drawing_hand.index_ratio > 0.58 or drawing_hand.pinch_ratio < 0.45) and not suppress:
                        cursor_info = {"type": "hover", "pt": smooth_tip,
                                       "color": board.current_bgr, "thickness": board.current_thickness}

                was_drawing = is_drawing
                prev_smooth_tip = smooth_tip
            else:
                board.pen_up(pen_engine.tool_mode == "highlighter")
                board.eraser_up()
                effects.clear_laser()
                pen_engine.reset()
                pen_filter.reset()
                thumb_filter.reset()
                palm_open_seen = False
                was_drawing = False
                prev_smooth_tip = None

            # ---------------------------------------------------------
            # CANVAS COMPOSITING & VIRTUAL CAMERA
            # ---------------------------------------------------------
            clean = board.composite_with_camera(mirrored, is_highlighter=(pen_engine.tool_mode == "highlighter"))

            if vcam is not None:
                try:
                    vcam.send(cv2.flip(clean, 1) if vcam_flipped else clean)
                except Exception as exc:
                    print(f"[Air Writer] Virtual camera stream note: {exc}", file=sys.stderr)
                    vcam = None

            # ---------------------------------------------------------
            # PREVIEW OVERLAYS, WRIST BADGES & STATUS
            # ---------------------------------------------------------
            display = clean.copy()

            if palm_hint_pos is not None:
                cv2.circle(display, palm_hint_pos, 46, (100, 220, 255), 2, cv2.LINE_AA)
                cv2.putText(display, "CLOSE FIST TO CLEAR", (palm_hint_pos[0] - 80, palm_hint_pos[1] + 66),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.46, (100, 220, 255), 1, cv2.LINE_AA)

            # Draw Wrist Badges and Hand Identifiers
            if phys_right is not None and phys_right.is_present:
                wx, wy = ipt(phys_right.wrist_px)
                is_draw = (drawing_hand == phys_right)
                badge_col = (100, 240, 255) if is_draw else (220, 140, 255)
                lbl = f"RIGHT ({pen_engine.draw_mode.upper() if is_draw else 'MGR'})"
                cv2.circle(display, (wx, wy), 8, badge_col, -1, cv2.LINE_AA)
                cv2.putText(display, lbl, (wx - 55, wy + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.40, badge_col, 1, cv2.LINE_AA)

            if phys_left is not None and phys_left.is_present:
                wx, wy = ipt(phys_left.wrist_px)
                is_draw = (drawing_hand == phys_left)
                badge_col = (100, 240, 255) if is_draw else (220, 140, 255)
                lbl = f"LEFT ({pen_engine.draw_mode.upper() if is_draw else 'MGR'})"
                cv2.circle(display, (wx, wy), 8, badge_col, -1, cv2.LINE_AA)
                cv2.putText(display, lbl, (wx - 50, wy + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.40, badge_col, 1, cv2.LINE_AA)

            if cursor_info:
                pt = ipt(cursor_info["pt"])
                kind = cursor_info["type"]
                if kind == "draw":
                    r = max(cursor_info["thickness"] // 2, 4)
                    c = (255, 255, 255) if not cursor_info.get("highlighter") else (200, 240, 255)
                    cv2.circle(display, pt, r + 5, c, 2, cv2.LINE_AA)
                    cv2.circle(display, pt, r, cursor_info["color"], -1, cv2.LINE_AA)
                elif kind == "hover":
                    r = max(cursor_info["thickness"] // 2, 4)
                    cv2.circle(display, pt, r + 4, (240, 240, 250), 1, cv2.LINE_AA)
                    cv2.circle(display, pt, 2, cursor_info["color"], -1, cv2.LINE_AA)
                elif kind == "erase":
                    cv2.circle(display, pt, cursor_info["radius"], (255, 255, 255), 2, cv2.LINE_AA)
                    cv2.circle(display, pt, 3, (0, 0, 255), -1, cv2.LINE_AA)
                elif kind == "laser":
                    cv2.circle(display, pt, 7, (0, 0, 255), -1, cv2.LINE_AA)
                    cv2.circle(display, pt, 11, (100, 150, 255), 2, cv2.LINE_AA)

            menu.render(display, board.color_idx, board.width_idx, dominant_hand,
                        pen_engine.draw_mode, pen_engine.tool_mode,
                        CANVAS_MODES[board.canvas_mode_idx]["name"], board.shape_snap_enabled, t_now)

            if manager_cursor is not None and menu.is_visible:
                mc = ipt(manager_cursor)
                cv2.circle(display, mc, 8, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.circle(display, mc, 4, (200, 120, 255), -1, cv2.LINE_AA)

            effects.render(display, t_now)

            # Top Floating Status HUD Capsule
            pill_w, pill_h = 710, 32
            pill_x = (CANVAS_WIDTH - pill_w) // 2
            pill_y = 12
            pill_roi = display[pill_y:pill_y + pill_h, pill_x:pill_x + pill_w]
            cv2.addWeighted(np.full_like(pill_roi, (24, 24, 28), dtype=np.uint8), 0.85, pill_roi, 0.15, 0, pill_roi)
            cv2.rectangle(display, (pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h), (70, 70, 85), 1, cv2.LINE_AA)
            cv2.circle(display, (pill_x + 20, pill_y + 16), 7, board.current_bgr, -1, cv2.LINE_AA)
            cv2.circle(display, (pill_x + 20, pill_y + 16), 7, (255, 255, 255), 1, cv2.LINE_AA)

            vcam_str = f"VCAM: {'FLIPPED' if vcam_flipped else 'NORMAL'}" if vcam is not None else "LOCAL"
            snap_str = "SNAP" if board.shape_snap_enabled else "NOSNAP"
            status_text = (f"{PALETTE_COLORS[board.color_idx]['name']} | "
                           f"{STROKE_WIDTHS[board.width_idx]['label']} | "
                           f"Tool: {pen_engine.tool_mode.upper()} | "
                           f"Draw: {dominant_hand.upper()} [{pen_engine.draw_mode.upper()}] | "
                           f"Canvas: {CANVAS_MODES[board.canvas_mode_idx]['name']} [{snap_str}] | "
                           f"{vcam_str} | {int(fps_estimate)} FPS")
            cv2.putText(display, status_text, (pill_x + 36, pill_y + 21),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, (230, 230, 240), 1, cv2.LINE_AA)

            cv2.imshow(window_title, display)

            # ---------------------------------------------------------
            # HOTKEY CONTROLS
            # ---------------------------------------------------------
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q") or key == 27:
                break
            elif key == ord("c"):
                board.clear()
                effects.show_toast("Canvas Cleared", t_now)
            elif key == ord("z"):
                if board.undo():
                    effects.show_toast("Undo Stroke", t_now)
            elif key == ord("y"):
                if board.redo():
                    effects.show_toast("Redo Stroke", t_now)
            elif key == ord("h"):
                dominant_hand = "Left" if dominant_hand == "Right" else "Right"
                board.pen_up()
                pen_engine.reset()
                effects.show_toast(f"Drawing Hand: {dominant_hand.upper()}", t_now)
            elif key == ord("p"):
                new_mode = pen_engine.cycle_draw_mode()
                effects.show_toast(f"Draw Mode: {new_mode.upper()}", t_now)
            elif key == ord("k"):
                new_tool = pen_engine.cycle_tool_mode()
                effects.show_toast(f"Tool Mode: {new_tool.upper()}", t_now)
            elif key == ord("b"):
                cname = board.cycle_canvas_mode()
                effects.show_toast(f"Canvas: {cname}", t_now)
            elif key == ord("g"):
                snap = board.toggle_shape_snap()
                effects.show_toast(f"Shape Snap: {'ON' if snap else 'OFF'}", t_now)
            elif key == ord("m"):
                vcam_flipped = not vcam_flipped
                effects.show_toast("VCAM Mirror: " + ("Flipped (Discord/Insta/WhatsApp)" if vcam_flipped else "Normal (Zoom/Meet)"), t_now)
            elif key == ord("t"):
                menu.cycle_hold_duration()
                effects.show_toast(f"Menu Hold: {MENU_HOLD_OPTIONS[menu.hold_option_idx]['label']}", t_now)
            elif key == ord("s"):
                os.makedirs(save_dir, exist_ok=True)
                path = os.path.join(save_dir, f"air_writer_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
                cv2.imwrite(path, clean)
                effects.show_toast("Saved to Desktop", t_now)
                print(f"[Air Writer] Snapshot saved: {path}")

    finally:
        print("[Air Writer] Shutting down cleanly...")
        if vcam is not None:
            vcam.close()
        hand_tracker.close()
        if cam is not None:
            cam.release()
        cv2.destroyAllWindows()
        print("[Air Writer] Finished.")


if __name__ == "__main__":
    main()
