export const initialPortfolioData = {
  profile: {
    name: "Alex Morgan",
    title: "Senior Full Stack & Frontend Architect",
    tagline: "Building high-performance web applications, intuitive interfaces, and scalable SaaS solutions for global clients.",
    bio: "With over 7 years of engineering experience, I specialize in crafting modern web applications, high-converting client websites, and interactive digital products. I work closely with startups, agencies, and businesses to turn ambitious ideas into polished realities.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
    email: "alex.morgan.dev@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA (Remote Available)",
    availableForHire: true,
    socials: {
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      twitter: "https://twitter.com",
      website: "https://example.com"
    }
  },
  projects: [
    {
      id: "proj-1",
      title: "Nova Analytics Dashboard",
      description: "Real-time SaaS analytics dashboard with interactive data visualization, custom report generator, and multi-tenant team management.",
      category: "SaaS",
      url: "https://example.com",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
      featured: true,
      tags: ["React", "TypeScript", "Tailwind CSS", "Recharts", "Node.js"]
    },
    {
      id: "proj-2",
      title: "Lumina E-Commerce Storefront",
      description: "Ultra-fast headless e-commerce store with seamless cart interactions, dynamic product filters, and stripe checkout integration.",
      category: "E-Commerce",
      url: "https://wikipedia.org",
      imageUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800",
      featured: true,
      tags: ["Next.js", "Stripe", "Tailwind CSS", "GraphQL"]
    },
    {
      id: "proj-3",
      title: "Apex Studio Agency Site",
      description: "Sleek creative portfolio agency website featuring 3D webgl interactions, dark mode theme, and smooth page transitions.",
      category: "Landing Pages",
      url: "https://example.com",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
      featured: true,
      tags: ["React", "Framer Motion", "Tailwind CSS"]
    },
    {
      id: "proj-4",
      title: "TaskFlow Workspace App",
      description: "Productivity app for agile teams featuring real-time kanban boards, live chat collaboration, and automated workflow triggers.",
      category: "Web Apps",
      url: "https://example.com",
      imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=800",
      featured: false,
      tags: ["React", "Redux Toolkit", "WebSockets", "Node.js"]
    }
  ],
  skills: [
    { name: "React & Next.js", level: 95, category: "Frontend" },
    { name: "TypeScript / JavaScript", level: 90, category: "Languages" },
    { name: "Tailwind CSS & UI Systems", level: 95, category: "Frontend" },
    { name: "Node.js & Express", level: 85, category: "Backend" },
    { name: "GraphQL & REST APIs", level: 88, category: "Backend" },
    { name: "UI/UX & Figma", level: 80, category: "Design" }
  ],
  services: [
    {
      id: "serv-1",
      title: "Full Stack Web Development",
      description: "Custom web applications built from scratch with clean code, modern stack, scalable architecture, and seamless database integration.",
      price: "Starting at $2,500"
    },
    {
      id: "serv-2",
      title: "High-Converting Client Websites",
      description: "Speed-optimized, mobile-responsive websites designed to showcase your brand, drive lead generation, and convert visitors.",
      price: "Starting at $1,200"
    },
    {
      id: "serv-3",
      title: "SaaS Application Development",
      description: "Complete MVP and SaaS development including authentication, subscription payments, dashboard interfaces, and admin controls.",
      price: "Starting at $3,500"
    }
  ],
  testimonials: [
    {
      id: "test-1",
      name: "Sarah Jenkins",
      role: "CEO at TechPulse",
      content: "Alex delivered our company website ahead of schedule and exceeded every single expectation. The speed and polish of the site blew our clients away!",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"
    },
    {
      id: "test-2",
      name: "David Chen",
      role: "Product Lead at CloudScale",
      content: "Working with Alex was a fantastic experience. His technical expertise and sharp design sense gave our web app a modern edge.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
    }
  ]
};

const STORAGE_KEY = "portfolio_builder_data_v1";

export const getStoredPortfolio = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : initialPortfolioData;
  } catch (err) {
    console.error("Failed to read from localStorage", err);
    return initialPortfolioData;
  }
};

export const saveStoredPortfolio = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save to localStorage", err);
  }
};

export const resetPortfolioToDefault = () => {
  localStorage.removeItem(STORAGE_KEY);
  return initialPortfolioData;
};
