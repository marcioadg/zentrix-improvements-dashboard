
export const examplePlaybooks = {
  newEmployeeOnboarding: {
    title: "New Employee Onboarding",
    description: "A comprehensive onboarding program for new hires covering company culture, policies, tools, and role-specific training.",
    tags: ["onboarding", "new-hire", "orientation"],
    modules: [
      {
        title: "Welcome & Company Overview",
        description: "Introduction to company culture, mission, values, and organizational structure.",
        is_required: true,
        lessons: [
          {
            title: "Welcome to the Team",
            description: "A warm welcome message and overview of what to expect during onboarding.",
            lesson_type: "content",
            is_required: true,
            estimated_duration_minutes: 15,
            department_tags: ["all"],
            role_tags: ["all"],
            topic_tags: ["welcome", "introduction"],
            blocks: [
              {
                block_type: "text",
                content: {
                  text: "Welcome to our company! We're excited to have you join our team. This onboarding program will help you get started and feel comfortable in your new role.",
                  formatting: {}
                },
                is_required: true
              },
              {
                block_type: "video",
                content: {
                  url: "https://example.com/welcome-video",
                  platform: "youtube"
                },
                is_required: true
              }
            ]
          },
          {
            title: "Company Mission & Values",
            description: "Learn about our company's mission, vision, and core values.",
            lesson_type: "content",
            is_required: true,
            estimated_duration_minutes: 20,
            department_tags: ["all"],
            role_tags: ["all"],
            topic_tags: ["mission", "values", "culture"],
            blocks: [
              {
                block_type: "text",
                content: {
                  text: "Our mission is to create innovative solutions that make a positive impact. Our core values guide everything we do.",
                  formatting: {}
                },
                is_required: true
              },
              {
                block_type: "quiz",
                content: {
                  questions: [
                    {
                      id: "q1",
                      question: "What is our company's primary mission?",
                      type: "multiple_choice",
                      options: [
                        "To make profit",
                        "To create innovative solutions that make a positive impact",
                        "To be the biggest company",
                        "To work remotely"
                      ],
                      correct_answer: "To create innovative solutions that make a positive impact"
                    }
                  ],
                  pass_score: 80
                },
                is_required: true
              }
            ]
          }
        ]
      },
      {
        title: "HR Policies & Procedures",
        description: "Essential HR information including policies, benefits, and procedures.",
        is_required: true,
        lessons: [
          {
            title: "Employee Handbook",
            description: "Review of key policies and procedures from the employee handbook.",
            lesson_type: "content",
            is_required: true,
            estimated_duration_minutes: 30,
            department_tags: ["all"],
            role_tags: ["all"],
            topic_tags: ["policies", "procedures", "handbook"],
            blocks: [
              {
                block_type: "file",
                content: {
                  files: [
                    {
                      name: "Employee_Handbook_2024.pdf",
                      url: "https://example.com/handbook.pdf",
                      type: "pdf"
                    }
                  ]
                },
                is_required: true
              },
              {
                block_type: "checklist",
                content: {
                  items: [
                    "Read the complete employee handbook",
                    "Understand the code of conduct",
                    "Review vacation and sick leave policies",
                    "Understand the performance review process"
                  ],
                  allow_due_dates: false
                },
                is_required: true
              }
            ]
          },
          {
            title: "Benefits Overview",
            description: "Overview of health insurance, retirement plans, and other benefits.",
            lesson_type: "content",
            is_required: true,
            estimated_duration_minutes: 25,
            department_tags: ["all"],
            role_tags: ["all"],
            topic_tags: ["benefits", "insurance", "retirement"],
            blocks: [
              {
                block_type: "text",
                content: {
                  text: "We offer comprehensive benefits including health insurance, dental, vision, 401(k) matching, and more.",
                  formatting: {}
                },
                is_required: true
              },
              {
                block_type: "acknowledgment",
                content: {
                  message: "I acknowledge that I have reviewed the benefits information and understand the enrollment process.",
                  require_signature: true
                },
                is_required: true
              }
            ]
          }
        ]
      },
      {
        title: "Tools & Systems Training",
        description: "Training on essential tools and systems used in daily work.",
        is_required: true,
        lessons: [
          {
            title: "IT Setup & Security",
            description: "Computer setup, security protocols, and password policies.",
            lesson_type: "content",
            is_required: true,
            estimated_duration_minutes: 45,
            department_tags: ["all"],
            role_tags: ["all"],
            topic_tags: ["IT", "security", "setup"],
            blocks: [
              {
                block_type: "checklist",
                content: {
                  items: [
                    "Set up computer and accounts",
                    "Install required software",
                    "Complete security training",
                    "Set up two-factor authentication",
                    "Test access to all systems"
                  ],
                  allow_due_dates: true
                },
                is_required: true
              }
            ]
          },
          {
            title: "Communication Tools",
            description: "How to use Slack, email, video conferencing, and other communication tools.",
            lesson_type: "content",
            is_required: true,
            estimated_duration_minutes: 20,
            department_tags: ["all"],
            role_tags: ["all"],
            topic_tags: ["communication", "slack", "email"],
            blocks: [
              {
                block_type: "text",
                content: {
                  text: "We use Slack for team communication, Zoom for video calls, and Google Workspace for collaboration.",
                  formatting: {}
                },
                is_required: true
              }
            ]
          }
        ]
      },
      {
        title: "Role-Specific Training",
        description: "Training specific to your department and role responsibilities.",
        is_required: false,
        lessons: [
          {
            title: "Department Introduction",
            description: "Meet your team and understand your department's goals and processes.",
            lesson_type: "content",
            is_required: false,
            estimated_duration_minutes: 30,
            department_tags: ["engineering", "sales", "marketing"],
            role_tags: ["individual_contributor"],
            topic_tags: ["department", "team", "processes"],
            blocks: [
              {
                block_type: "text",
                content: {
                  text: "This section will be customized based on your specific department and role.",
                  formatting: {}
                },
                is_required: false
              }
            ]
          }
        ]
      }
    ]
  }
};

export const getExamplePlaybook = (type: keyof typeof examplePlaybooks) => {
  return examplePlaybooks[type];
};
