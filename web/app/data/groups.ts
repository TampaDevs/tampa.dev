/**
 * Local groups configuration
 * This includes both Meetup-aggregated groups and non-Meetup groups
 */

export interface LocalGroup {
  slug: string;
  name: string;
  description: string;
  website: string;
  logo: string;
  meetupUrlname?: string; // If present, events are fetched from API
  socialLinks?: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  };
  tags: string[];
  featured?: boolean;
}

export const groups: LocalGroup[] = [
  {
    slug: "tampa-devs",
    name: "Tampa Devs",
    description:
      "Tampa Devs is the fastest-growing nonprofit community for software developers in Tampa Bay.",
    website: "https://www.tampadevs.com/",
    logo: "/images/groups/tampadevs2.jpg",
    meetupUrlname: "tampadevs",
    socialLinks: {
      slack: "https://go.tampa.dev/slack",
      meetup: "https://www.meetup.com/tampadevs/",
    },
    tags: ["general", "networking", "community"],
    featured: true,
  },
  {
    slug: "ark-innovation-center",
    name: "ARK Innovation Center",
    description:
      "We connect young companies with capital and coaching. We help get companies off the ground and on maps. We are home to independent workers including solo entrepreneurs, lawyers, investors, accountants, graphic designers, engineers, and other related occupations geared towards tech startups.",
    website: "https://tbinnovates.com/",
    logo: "/images/groups/tbinno.jpg",
    tags: ["startups", "coworking"],
    featured: true,
  },
  {
    slug: "data-analytics-ai-tampa-bay",
    name: "Data Analytics & AI - Tampa Bay",
    description:
      "Analytics touches every part of the organization. From operations to marketing to delivery, everyone needs data to maximize their own impact. Our events focus on how you can manage data more effectively with fast, secure, and effective insights.",
    website: "https://www.meetup.com/dataanalyticstampa/",
    logo: "/images/groups/dataanalyticstampa.jpg",
    meetupUrlname: "dataanalyticstampa",
    tags: ["data", "analytics", "ai"],
    featured: true,
  },
  {
    slug: "embarc-collective",
    name: "Embarc Collective",
    description:
      "Embarc Collective is the fastest-growing startup hub in Florida. Our mission is to help Tampa Bay's startup talent build bold, scalable, thriving companies.",
    website: "https://www.embarccollective.com/",
    logo: "/images/groups/embarc.jpg",
    tags: ["startups", "entrepreneurship"],
    featured: true,
  },
  {
    slug: "tampa-bay-aws",
    name: "Tampa Bay AWS User Group",
    description:
      "Whether you are an avid user of Amazon Web Services (AWS) today, or you just want to find out more about the advantages of using AWS, we welcome you to join a passionate group of enthusiasts who want to exchange ideas, thoughts, best practices and questions in a comfortable setting where everyone is welcome.",
    website: "https://www.meetup.com/tampa-bay-aws/",
    logo: "/images/groups/tbaws.jpg",
    meetupUrlname: "tampa-bay-aws",
    tags: ["cloud", "aws"],
  },
  {
    slug: "tampa-bay-azure",
    name: "Tampa Bay Azure User Group",
    description:
      "The goal of this Azure user group is to provide a community-based organization to build our collective knowledge of the benefits of Azure and also provide networking opportunities with like-minded individuals and organizations.",
    website: "https://www.meetup.com/microsoft-azure-tampa/",
    logo: "/images/groups/tbazure.jpg",
    meetupUrlname: "microsoft-azure-tampa",
    tags: ["cloud", "azure", "microsoft"],
  },
  {
    slug: "tampa-bay-data-engineering",
    name: "Tampa Bay Data Engineering Group",
    description:
      "We are dedicated to building and growing a community interested in making data do more for all facets of business, society, and daily life. Anyone interested in data engineering, operations, management, governance, and general data issues should join our group.",
    website: "https://www.meetup.com/tampa-bay-data-engineering-group/",
    logo: "/images/groups/tbdeg.jpeg",
    meetupUrlname: "tampa-bay-data-engineering-group",
    tags: ["data", "engineering"],
  },
  {
    slug: "tampa-bay-devops",
    name: "Tampa Bay DevOps Meetup",
    description:
      "This is a group for anyone interested in learning and sharing how DevOps can transform all aspects of technology innovation in a continual and sustainable manner within in an enterprise environment.",
    website: "https://www.meetup.com/tampa-devops-meetup/",
    logo: "/images/groups/dodays.png",
    meetupUrlname: "tampa-devops-meetup",
    tags: ["devops", "infrastructure"],
  },
  {
    slug: "tampa-bay-gcloud",
    name: "Tampa Bay Google Cloud User Group",
    description:
      "This group is for technology & cloud enthusiasts and practitioners to learn more about Google Cloud technologies, new product announcements, live demos, discussions and more.",
    website: "https://www.meetup.com/tampa-bay-google-cloud-user-group/",
    logo: "/images/groups/tbgcloud.jpeg",
    meetupUrlname: "tampa-bay-google-cloud-user-group",
    tags: ["cloud", "gcp", "google"],
  },
  {
    slug: "tampa-bay-innovation-hub",
    name: "Tampa Bay Innovation Hub",
    description:
      "If you are looking for more in life than surface level discussions, and boring 9-5 jobs, join us! We specialize in anything and everything technologically innovative in society today (and the future).",
    website: "https://www.meetup.com/tampa-bay-innovation-hub/",
    logo: "/images/groups/tbih.webp",
    meetupUrlname: "tampa-bay-innovation-hub",
    tags: ["innovation", "startups"],
  },
  {
    slug: "tampa-jug",
    name: "Tampa Java User Group",
    description:
      "Tampa Java User Group (TJUG) is for anyone who uses Java, wants to learn, hire or network with other professionals.",
    website: "https://www.meetup.com/tampa-jug/",
    logo: "/images/groups/tbjug.jpg",
    meetupUrlname: "tampa-jug",
    tags: ["java", "jvm"],
  },
  {
    slug: "tampa-bay-python",
    name: "Tampa Bay Python",
    description: "Welcome to the Tampa Bay Python Meetup group!",
    website: "https://www.meetup.com/tampa-bay-python/",
    logo: "/images/groups/tbpython.png",
    meetupUrlname: "tampa-bay-python",
    tags: ["python"],
  },
  {
    slug: "tampa-bay-techies",
    name: "Tampa Bay Techies",
    description:
      "Tampa Bay Techies is a 501(c)(3) organization that promotes personal and professional growth for individuals in the technology community through networking, mentorship, volunteering, and training.",
    website: "https://tampabaytechies.com/",
    logo: "/images/groups/tbtechies.jpg",
    meetupUrlname: "tampa-bay-techies",
    tags: ["community", "networking", "mentorship"],
  },
  {
    slug: "tampa-hackerspace",
    name: "Tampa Hackerspace",
    description:
      "We are a non-profit makerspace. We offer classes and events on all sorts of making. Most are open to everyone. You can join as a member and have 24/7 access to our workshop and tools.",
    website: "https://tampahackerspace.com/",
    logo: "/images/groups/ths.jpg",
    meetupUrlname: "tampa-hackerspace",
    tags: ["hardware", "maker", "iot"],
  },
  {
    slug: "tampa-qa-testing",
    name: "Tampa Bay QA & Testing Meetup",
    description:
      "This is a group for anyone interested in software QA and testing. All skill levels are welcome. We will have regular meetups to discuss various topics in software testing and QA.",
    website: "https://www.meetup.com/tampa-software-qa-and-testing-meetup/",
    logo: "/images/groups/tampaqa.jpg",
    meetupUrlname: "tampa-software-qa-and-testing-meetup",
    tags: ["qa", "testing"],
  },
  {
    slug: "tampa-ai",
    name: "Tampa Artificial Intelligence Meetup",
    description:
      "Our primary goal is to learn about the practical use and development of AI applications.",
    website: "https://www.meetup.com/Tampa-Artificial-Intelligence-Meetup/",
    logo: "/images/groups/ai.jpg",
    meetupUrlname: "Tampa-Artificial-Intelligence-Meetup",
    tags: ["ai", "machine-learning"],
  },
  {
    slug: "high-tech-connect",
    name: "High Tech Connect",
    description:
      "High Tech Connect's mission is to be the interconnecting mesh for Tampa's growing tech community.",
    website: "https://www.hightechconnect.io/",
    logo: "/images/groups/htc.png",
    meetupUrlname: "high-tech-connect",
    tags: ["networking", "community"],
  },
  {
    slug: "pinellas-tech-network",
    name: "Pinellas Tech Network",
    description:
      "The Pinellas Tech Network meets once a month in Palm Harbor, Florida at Geographic Solutions' main campus.",
    website: "https://www.meetup.com/pinellas-tech-network/",
    logo: "/images/groups/ptn.png",
    meetupUrlname: "pinellas-tech-network",
    tags: ["networking", "pinellas"],
  },
  {
    slug: "suncoast-developers-guild",
    name: "Suncoast Developers Guild",
    description:
      "The Academy at Suncoast Developers Guild is a code school that serves people, not profit. We are changing lives and teaching people to be the best software developers they can be.",
    website: "https://suncoast.io/",
    logo: "/images/groups/suncoast.png",
    meetupUrlname: "suncoast-developer-guild",
    tags: ["education", "bootcamp"],
  },
  {
    slug: "tech4good-tampa",
    name: "Tech4Good Tampa",
    description:
      "Our Tech4Good group brings together nonprofits in need of technology guidance, education, and/or troubleshooting AND technology folks interested in helping nonprofits pro bono with their technology questions/needs.",
    website: "https://www.meetup.com/tech4good-tampa/",
    logo: "/images/groups/tech4good.jpeg",
    meetupUrlname: "tech4good-tampa",
    tags: ["nonprofit", "volunteering"],
  },
  {
    slug: "women-who-code-tampa",
    name: "Women Who Code Tampa",
    description:
      "Women Who Code is the largest and most active community of engineers dedicated to inspiring women to excel in technology careers.",
    website: "https://www.meetup.com/Women-Who-Code-Tampa/",
    logo: "/images/groups/wwcode.jpg",
    meetupUrlname: "Women-Who-Code-Tampa",
    tags: ["diversity", "women-in-tech"],
  },
  {
    slug: "tampabayproductgroup",
    name: "Tampa Bay Product Group",
    description:
      "Tampa Bay Product Group is a community for product managers, product owners, and anyone interested in product management to share knowledge, network, and grow together.",
    website: "https://www.meetup.com/tampabayproductgroup/",
    logo: "/images/groups/tbproduct.png",
    meetupUrlname: "tampabayproductgroup",
    tags: ["product", "product-management"],
  },
  {
    slug: "tampabaydesigners",
    name: "Tampa Bay Designers",
    description:
      "Tampa Bay Designers is a local, volunteer-based design community for local designers and those interested in design to connect, learn, and grow. Founded in 2019 by Brendan Ciccone, the group merged with Tampa Bay UX in 2025 and is now led by Amanda Starling, Andy Weir, Christina Adames, and Sarah Zatkovich.",
    website: "https://www.meetup.com/tampabaydesigners/",
    logo: "/images/groups/tbdesign.webp",
    meetupUrlname: "tampabaydesigners",
    tags: ["design", "ux"],
  },
  // Non-Meetup groups (no event aggregation)
  {
    slug: "cigarcitysec",
    name: "CigarCitySec",
    description:
      "CitySec is an unaffiliated collection of informal meetups for like-minded security professionals. CitySec groups meet to discuss topics of interest in a non-work, non-vendor setting; preferably while drinking.",
    website: "https://cigarcitysec.com/",
    logo: "/images/groups/ccsec.png",
    tags: ["security", "infosec"],
  },
];

/**
 * Get all groups that have Meetup integration
 */
export function getMeetupGroups(): LocalGroup[] {
  return groups.filter((g) => g.meetupUrlname);
}

/**
 * Get all Meetup urlnames for API queries
 */
export function getMeetupUrlnames(): string[] {
  return groups.filter((g) => g.meetupUrlname).map((g) => g.meetupUrlname!);
}

/**
 * Get a group by slug
 */
export function getGroupBySlug(slug: string): LocalGroup | undefined {
  return groups.find((g) => g.slug === slug);
}

/**
 * Get a group by Meetup urlname
 */
export function getGroupByMeetupUrlname(
  urlname: string
): LocalGroup | undefined {
  return groups.find(
    (g) => g.meetupUrlname?.toLowerCase() === urlname.toLowerCase()
  );
}

/**
 * Get featured groups
 */
export function getFeaturedGroups(): LocalGroup[] {
  return groups.filter((g) => g.featured);
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const group of groups) {
    for (const tag of group.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

/**
 * Get groups by tag
 */
export function getGroupsByTag(tag: string): LocalGroup[] {
  return groups.filter((g) => g.tags.includes(tag));
}
