export type ContentType = 'article' | 'step-guide' | 'checklist' | 'quiz';
export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonContent {
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  contentType: ContentType;
  content: string | StepGuideStep[] | ChecklistItem[] | QuizQuestion[];
  pathSlug: string;
}

export interface StepGuideStep {
  title: string;
  content: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LearningPath {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: LessonContent[];
}

export const learningPaths: LearningPath[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the fundamentals of using Zentrix OS',
    icon: 'Rocket',
    color: 'from-blue-500 to-cyan-500',
    lessons: [
      {
        slug: 'welcome-to-zentrix',
        title: 'Welcome to Zentrix OS',
        description: 'An overview of the platform and its capabilities',
        estimatedMinutes: 5,
        contentType: 'article',
        pathSlug: 'getting-started',
        content: `# Welcome to Zentrix OS

Zentrix OS is your comprehensive business operating system designed to help teams execute better, faster, and with clarity.

## What You'll Learn

In this training academy, you'll discover how to leverage Zentrix OS's powerful features to transform how your team works together.

## Core Capabilities

**Execution Tools**: Track metrics, manage tasks, set goals, and resolve issues with precision.

**Strategic Planning**: Build your company strategy, visualize your org structure, and analyze team performance.

**AI Assistant**: Get intelligent insights and recommendations powered by AI that understands your business context.

## Getting the Most Value

The best way to learn Zentrix OS is to use it actively. As you go through these lessons, try the features in your actual workspace.

Start with the basics, then progressively adopt more advanced capabilities as your team grows comfortable with the platform.`,
      },
      {
        slug: 'navigating-the-platform',
        title: 'Navigating the Platform',
        description: 'Master the Zentrix OS interface and navigation',
        estimatedMinutes: 3,
        contentType: 'step-guide',
        pathSlug: 'getting-started',
        content: [
          {
            title: 'Understanding the Sidebar',
            content: 'The left sidebar is your main navigation hub. It\'s organized into sections: Execution (Dashboard, Metrics, Tasks, Goals, Issues, Meetings) and Strategy (People, Org Chart, Strategy Designer, Zentrix AI).'
          },
          {
            title: 'Switching Companies',
            content: 'If you\'re part of multiple companies, click the company name at the top of the sidebar to switch between them.'
          },
          {
            title: 'Quick Access',
            content: 'Use the keyboard shortcut Cmd/Ctrl + K to open the command palette for instant access to any feature.'
          },
          {
            title: 'User Settings',
            content: 'Click your profile avatar at the bottom of the sidebar to access your personal settings, preferences, and account details.'
          }
        ] as StepGuideStep[],
      },
      {
        slug: 'your-dashboard',
        title: 'Your Dashboard',
        description: 'Understanding your personal dashboard',
        estimatedMinutes: 4,
        contentType: 'article',
        pathSlug: 'getting-started',
        content: `# Your Dashboard

The Dashboard is your command center - a personalized view of everything important to you right now.

## Dashboard Components

**Your Tasks**: See all tasks assigned to you across all teams, with due dates and priorities clearly visible.

**Team Metrics**: Quick overview of key metrics you own or track, showing current values vs targets.

**Goals Progress**: Visual representation of goal completion for goals you\'re responsible for.

**Recent Activity**: Stay updated on what\'s happening across your teams.

## Customization

Your dashboard automatically adapts based on your role and team assignments. As you join more teams or take on new responsibilities, relevant information will appear automatically.

## Best Practices

Check your dashboard at the start of each day to understand your priorities. Use it as your planning tool to organize your week.`,
      },
    ],
  },
  {
    slug: 'execution-mastery',
    title: 'Execution Mastery',
    description: 'Master the tools for daily execution',
    icon: 'Target',
    color: 'from-green-500 to-emerald-500',
    lessons: [
      {
        slug: 'metrics-basics',
        title: 'Metrics: The Basics',
        description: 'Learn how to track and manage metrics',
        estimatedMinutes: 8,
        contentType: 'article',
        pathSlug: 'execution-mastery',
        content: `# Metrics: The Basics

Metrics are the heartbeat of your business. They provide objective, measurable data about performance and progress.

## What Are Metrics?

A metric is a measurable data point tracked over time. Examples: revenue, customer count, conversion rate, response time.

Each metric has:
- **Name**: What you\'re measuring
- **Owner**: Who\'s accountable for this number
- **Target**: What "good" looks like
- **Actual Value**: Current performance
- **Frequency**: How often you track it (typically weekly)

## Creating Your First Metric

1. Go to the Metrics page
2. Click "Add Metric"
3. Name it clearly (e.g., "Weekly Revenue")
4. Assign an owner (usually yourself or a team member)
5. Set a target value and logic (greater than/less than/equal to)
6. Choose your team

## Weekly Tracking

Metrics are tracked weekly. Each week, enter the actual value. Zentrix OS will show you:
- Current value vs target (on track/off track)
- Trend over time
- Percentage variance

## Target Logic

Choose the right comparison:
- **Greater than or equal**: For metrics where higher is better (revenue, customers)
- **Less than or equal**: For metrics where lower is better (costs, response time)
- **Equal to**: For precise targets

## Best Practices

**Be Consistent**: Update metrics on the same day each week.

**Keep It Simple**: Track what matters most, not everything possible.

**Review Trends**: Don't just look at one week - watch the pattern over time.

**Take Action**: When a metric goes off track, create a task or issue to address it.`,
      },
      {
        slug: 'managing-tasks',
        title: 'Managing Tasks',
        description: 'Effective task management strategies',
        estimatedMinutes: 7,
        contentType: 'step-guide',
        pathSlug: 'execution-mastery',
        content: [
          {
            title: 'Understanding Task Types',
            content: 'Zentrix OS has two task types: Personal Tasks (only you can see) and Team Tasks (visible to everyone on the team). Choose the right type based on whether the work requires team visibility.'
          },
          {
            title: 'Creating a Task',
            content: 'Click the "+" button on the Tasks page. Give it a clear, action-oriented title (starts with a verb). Add a description if needed. Assign it to yourself or a team member. Set a due date.'
          },
          {
            title: 'Task Status',
            content: 'Tasks move through three columns: To Do, In Progress, and Done. Drag tasks between columns as work progresses. Done tasks are archived after 7 days.'
          },
          {
            title: 'Due Dates Matter',
            content: 'Always set due dates. Tasks without due dates tend to never get done. Zentrix OS will highlight overdue tasks in red and send reminders.'
          },
          {
            title: 'Team Collaboration',
            content: 'For team tasks, you can assign multiple people, add comments, and attach files. Use this for work that requires coordination.'
          }
        ] as StepGuideStep[],
      },
      {
        slug: 'setting-goals',
        title: 'Setting Goals',
        description: 'How to create and track meaningful goals',
        estimatedMinutes: 10,
        contentType: 'article',
        pathSlug: 'execution-mastery',
        content: `# Setting Goals

Goals are your big-picture objectives - the important outcomes you want to achieve over 90 days.

## Goal vs Task: What's the Difference?

**Goals** are outcomes (results you want to achieve). Examples: "Launch new product", "Achieve $100K MRR", "Complete website redesign"

**Tasks** are actions (specific work to do). Examples: "Write product spec", "Send 10 sales emails", "Design homepage mockup"

Goals take weeks or months. Tasks take hours or days.

## Creating Effective Goals

A good goal is:
- **Specific**: Clear what success looks like
- **Measurable**: You know when it\'s complete
- **Time-bound**: Has a target date (typically 90 days)
- **Owned**: Someone is accountable for making it happen

## Goal Structure

**Title**: State the outcome clearly. Start with a verb.

**Target Date**: When will this be complete? Default to 90 days (quarterly).

**Owner**: Who\'s responsible for driving this to completion?

**Progress**: Update progress percentage as you make headway.

**Status**: On Track (green), At Risk (yellow), or Off Track (red).

## Milestones

Break large goals into smaller milestones. Each milestone is a checkpoint on the way to completion.

Milestones help you:
- Track incremental progress
- Identify problems early
- Celebrate small wins
- Keep momentum

## Team vs Company Goals

**Team Goals**: Assigned to a specific team, visible to team members.

**Company Goals**: Visible to everyone, represent company-wide priorities.

Choose based on scope and who needs visibility.

## Weekly Reviews

During weekly team meetings, review goal progress. Update status and percentages. Discuss roadblocks. Adjust plans as needed.`,
      },
      {
        slug: 'resolving-issues',
        title: 'Resolving Issues',
        description: 'A structured approach to problem-solving',
        estimatedMinutes: 9,
        contentType: 'article',
        pathSlug: 'execution-mastery',
        content: `# Resolving Issues

Issues are problems, obstacles, or opportunities that need discussion and resolution.

## What Qualifies as an Issue?

An issue is something that:
- Blocks progress on a goal or metric
- Requires input from multiple people
- Doesn't have an obvious solution
- Needs discussion and decision-making

Examples: "Marketing budget unclear", "Client unhappy with deliverable", "Need to hire developer"

## The Problem-Solving Process

**Step 1: Identify the Issue**
Write a clear, specific title. "Client issues" is too vague. "Client ABC wants refund for Q4 project" is specific.

**Step 2: Discuss**
In your team meeting, discuss the issue. Get all perspectives on the table. What\'s really happening? What have we tried?

**Step 3: Solve**
Brainstorm solutions. Pick the best one. Decide who will do what by when.

**Step 4: Create To-Dos**
Convert the solution into specific tasks with owners and due dates.

**Step 5: Close the Issue**
Mark the issue as resolved. The tasks will ensure follow-through.

## Issue Ownership

Every issue needs an owner - someone responsible for driving it to resolution. The owner:
- Ensures the issue gets discussed
- Gathers relevant information
- Facilitates the conversation
- Creates follow-up tasks

The owner doesn\'t have to solve it alone - just make sure it gets solved.

## Priority and Voting

Teams can vote on issues to prioritize which ones to tackle first. Higher-voted issues appear at the top of your list.

Use this when you have more issues than meeting time.

## Best Practices

**Be Specific**: Vague issues lead to vague discussions.

**One Issue, One Topic**: Don't combine multiple problems into one issue.

**Close Resolved Issues**: Keep your list clean and current.

**Follow Up**: Create tasks to ensure solutions actually happen.`,
      },
    ],
  },
  {
    slug: 'strategic-planning',
    title: 'Strategic Planning',
    description: 'Build your company strategy and structure',
    icon: 'Lightbulb',
    color: 'from-purple-500 to-pink-500',
    lessons: [
      {
        slug: 'strategy-designer',
        title: 'Strategy Designer',
        description: 'Create your strategic plan',
        estimatedMinutes: 12,
        contentType: 'article',
        pathSlug: 'strategic-planning',
        content: `# Strategy Designer

The Strategy Designer helps you build and document your company\'s strategic plan.

## Core Components

**Core Values**: The fundamental beliefs that guide your company\'s behavior and decisions.

**Core Focus**: What you do (your niche) and why you do it (your purpose).

**10-Year Target**: Your long-term vision - where you want to be in 10 years.

**3-Year Picture**: A vivid description of what your company looks like in 3 years.

**1-Year Plan**: Key goals and metrics for the next 12 months.

## Why Strategy Matters

Strategy gives your team clarity and alignment. Everyone knows:
- What the company stands for
- Where we\'re heading
- What we need to accomplish this year
- How we make decisions

Without strategy, you\'re reactive. With strategy, you\'re intentional.

## Creating Your Strategy

Work through each section thoughtfully. This isn\'t a one-sitting exercise.

**Core Values**: What principles are non-negotiable? What behaviors do you want to see every day?

**Purpose**: Why does your company exist beyond making money?

**Niche**: What do you do better than anyone? What\'s your unique positioning?

**10-Year Target**: Dream big but be specific. Revenue? Impact? Scale?

**3-Year Picture**: Describe your company in detail. How many employees? What products? Which markets?

**1-Year Goals**: What must we achieve this year to stay on track toward the 3-year picture?

## Sharing Your Strategy

Once complete, share it with your team. Review it quarterly. Update it annually.

Strategy is a living document - it evolves as you learn and grow.`,
      },
      {
        slug: 'org-chart-basics',
        title: 'Org Chart Basics',
        description: 'Visualize and manage your organization structure',
        estimatedMinutes: 6,
        contentType: 'step-guide',
        pathSlug: 'strategic-planning',
        content: [
          {
            title: 'Understanding the Org Chart',
            content: 'The Org Chart visualizes your company structure - who reports to whom, which teams exist, and how roles are organized. Use it to understand hierarchies and spot gaps in coverage.'
          },
          {
            title: 'Adding Team Members',
            content: 'Invite users from the People page first. Then, in the Org Chart, assign them to roles and teams. Drag and drop to reorganize. Set reporting relationships by connecting boxes.'
          },
          {
            title: 'Creating Teams',
            content: 'Teams are how you organize work in Zentrix OS. Create teams for departments, projects, or functions. Assign members to teams from the People page or the Org Chart.'
          },
          {
            title: 'Roles and Responsibilities',
            content: 'Define clear roles for each position. Add responsibilities to clarify expectations. This helps during onboarding and performance reviews.'
          }
        ] as StepGuideStep[],
      },
      {
        slug: 'people-analyzer',
        title: 'People Analyzer',
        description: 'Assess team fit and performance',
        estimatedMinutes: 8,
        contentType: 'article',
        pathSlug: 'strategic-planning',
        content: `# People Analyzer

The People Analyzer helps you objectively evaluate whether team members are in the right roles.

## The Framework

For each person, assess three dimensions:

**Gets It**: Do they truly understand their role and responsibilities? Do they grasp what success looks like?

**Wants It**: Do they have the desire and drive to excel in this role? Is this work they\'re passionate about?

**Capacity to Do It**: Do they have the skills, experience, and capability to perform at a high level?

## Rating System

For each dimension, rate the person:
- **Plus (+)**: Strong, no concerns
- **Plus/Minus (+/-)**: Some concerns, room for improvement  
- **Minus (-)**: Significant concerns

A person who scores three pluses is in the right seat. Anything less indicates a mismatch that needs attention.

## What to Do With Results

**Three Plus (+++)**: Great fit! Support their growth and development.

**Two Plus (+±)**: Coaching opportunity. Help them improve the weak area.

**One Plus or Less**: Honest conversation needed. May need to change roles or part ways.

## Best Practices

**Be Objective**: Base ratings on observable behaviors and results, not personality.

**Regular Reviews**: Assess quarterly, not just during annual reviews.

**Transparent Communication**: Share the framework with your team. No surprises.

**Focus on Fit**: This isn\'t about good or bad people - it\'s about right role fit.

The goal is to help everyone find their "right seat" where they can thrive.`,
      },
    ],
  },
  {
    slug: 'running-meetings',
    title: 'Running Meetings',
    description: 'Facilitate productive team meetings',
    icon: 'Users',
    color: 'from-orange-500 to-red-500',
    lessons: [
      {
        slug: 'meeting-fundamentals',
        title: 'Meeting Fundamentals',
        description: 'The structure of effective weekly meetings',
        estimatedMinutes: 10,
        contentType: 'article',
        pathSlug: 'running-meetings',
        content: `# Meeting Fundamentals

Weekly team meetings are where alignment happens. A well-run meeting keeps everyone synchronized and focused.

## The Weekly Rhythm

Hold the same meeting at the same time every week. Consistency builds discipline and ensures attendance.

Recommended duration: 60-90 minutes for most teams.

## Meeting Structure

A productive meeting follows this flow (90 minutes total):

**1. Good News (5 min)**: Start positive. Each person shares a personal or professional win from the week.

**2. Metrics (5 min)**: Quick review of key metrics. On track or off track? Flag issues for later.

**3. Goals (5 min)**: Update progress on quarterly goals. Status check, not deep discussion.

**4. Headlines (5 min)**: Share important updates, wins, or announcements from the week.

**5. Tasks (5 min)**: Review open tasks. Mark complete or overdue. Create accountability.

**6. Issues (60 min)**: The heart of the meeting. Work through prioritized issues systematically.

**7. Wrap Up (5 min)**: Recap decisions, confirm new tasks, rate the meeting.

## The Facilitator Role

One person facilitates - keeps time, ensures participation, maintains focus.

The facilitator is not the boss or decision-maker. They\'re the timekeeper and process guide.

Rotate this role to develop leadership skills across the team.

## Meeting Discipline

**Start on Time**: Don\'t wait for latecomers. Reward those who show up on time.

**Stay on Topic**: Save tangents for after the meeting.

**Everyone Participates**: Make sure all voices are heard, not just the loudest.

**End with Clarity**: Every issue should result in clear next steps with owners and due dates.

## Common Pitfalls

**No Agenda**: Meetings wander without structure. Use the format above.

**Too Many People**: Keep core meetings to 5-7 people. Invite others for specific topics only.

**No Follow-Through**: Decisions without tasks are just conversations. Always create tasks.

**Skipping Meetings**: Weekly means weekly. Consistency matters more than perfection.`,
      },
      {
        slug: 'running-a-meeting',
        title: 'Running a Meeting',
        description: 'Step-by-step guide to facilitating',
        estimatedMinutes: 7,
        contentType: 'step-guide',
        pathSlug: 'running-meetings',
        content: [
          {
            title: 'Preparation (Before the Meeting)',
            content: 'Review last week\'s action items. Check which are complete. Update metrics with actual values. Scan the issues list to see what needs discussion. Arrive 2 minutes early to the meeting room (virtual or physical).'
          },
          {
            title: 'Good News (5 Minutes)',
            content: 'Start exactly on time. Each person shares one personal or professional win from the week. This builds positive energy and team connection. Keep it brief - one sentence per person.'
          },
          {
            title: 'Metrics (5 Minutes)',
            content: 'Quick review of key metrics. Each owner reports: on track or off track. If off track, briefly note why. Don\'t solve problems here - just flag them and create an issue if needed.'
          },
          {
            title: 'Goals (5 Minutes)',
            content: 'Update progress on each quarterly goal. Owner reports percentage complete and current status (green/yellow/red). Celebrate progress. Identify blockers. Don\'t solve here - just surface issues for later discussion.'
          },
          {
            title: 'Headlines (5 Minutes)',
            content: 'Share important updates, wins, or announcements from the week. Keep it factual and brief. These are FYI items, not discussion topics.'
          },
          {
            title: 'Tasks (5 Minutes)',
            content: 'Review open tasks. Mark complete tasks as done. Flag overdue tasks. Create accountability by confirming what\'s in progress. If a task is blocked, add an issue to discuss later.'
          },
          {
            title: 'Issues (60 Minutes)',
            content: 'The heart of the meeting. Pick the highest priority issue. Discuss: What\'s really happening? What have we tried? What should we do? Make a decision. Create specific tasks with owners and due dates. Move to the next issue. Repeat until time is up.'
          },
          {
            title: 'Wrap Up (5 Minutes)',
            content: 'Quickly recap decisions made and tasks created. Confirm task owners understand what they\'re committing to. Rate the meeting quality. End on time or early (never late).'
          }
        ] as StepGuideStep[],
      },
      {
        slug: 'problem-solving-in-meetings',
        title: 'Problem Solving in Meetings',
        description: 'The structured problem-solving approach',
        estimatedMinutes: 9,
        contentType: 'article',
        pathSlug: 'running-meetings',
        content: `# Problem Solving in Meetings

Most of your meeting time should be spent solving problems. Here\'s how to do it effectively.

## The Three-Step Process

When discussing any issue, follow this pattern:

**Step 1: Identify the Real Issue**
What\'s actually happening? Strip away symptoms to find the root cause.

Ask: "What else?" multiple times to get the full picture.

**Step 2: Discuss Possible Solutions**
Brainstorm options. Don\'t critique ideas yet - just get them on the table.

Encourage wild ideas. The best solutions often start as "crazy" suggestions.

**Step 3: Decide and Assign**
Pick the best solution. Create specific next steps. Assign each task to one person with a due date.

## Keep Discussions On Track

**Time Box**: Spend 5-10 minutes per issue maximum. If you need more time, schedule a separate deep-dive.

**Stay Focused**: Discuss one issue at a time. Don\'t jump around.

**Avoid Rabbit Holes**: If the conversation spirals, call it out. "We\'re in the weeds - let\'s refocus."

**Make Decisions**: Don\'t leave issues unresolved. Make the best decision with current information.

## Handling Disagreement

**Seek to Understand**: Make sure you truly understand opposing viewpoints.

**Data Over Opinions**: Look at facts and metrics when available.

**Voice All Concerns**: Everyone should feel heard before deciding.

**Commit**: Once a decision is made, everyone supports it fully - even if it wasn\'t their preference.

## Create Action Items

Every issue should end with tasks:
- What will we do?
- Who will do it?
- When will it be done?

If there\'s no task, there\'s no follow-through.

## Follow Up

At the next meeting, review last week\'s tasks. This accountability loop ensures things actually happen.`,
      },
    ],
  },
  {
    slug: 'ai-and-insights',
    title: 'AI & Insights',
    description: 'Leverage AI to work smarter',
    icon: 'Brain',
    color: 'from-indigo-500 to-blue-500',
    lessons: [
      {
        slug: 'zentrix-ai-partner',
        title: 'Zentrix AI Partner',
        description: 'Your intelligent business assistant',
        estimatedMinutes: 8,
        contentType: 'article',
        pathSlug: 'ai-and-insights',
        content: `# Zentrix AI Partner

Zentrix AI is your intelligent assistant that understands your business context and helps you make better decisions.

## What Can AI Do?

**Answer Questions**: Ask about your metrics, goals, tasks, or team performance. Get instant answers.

**Analyze Trends**: "Why is our customer metric declining?" AI will analyze your data and provide insights.

**Generate Ideas**: Stuck on a problem? Ask AI for suggestions and solutions.

**Draft Content**: Need to write an update or document? AI can help draft it.

**Summarize Information**: Get summaries of long conversations, documents, or meeting notes.

## How to Use AI Effectively

**Be Specific**: Instead of "Help with metrics", ask "What metrics are off track this week and why?"

**Provide Context**: The more information you give, the better the response.

**Iterate**: If the first answer isn\'t quite right, refine your question.

**Verify**: AI is a tool, not a replacement for judgment. Always verify important decisions.

## Example Queries

"Show me all overdue tasks across my teams"

"Which goals are at risk of missing their target date?"

"Summarize the main issues discussed in our last 3 team meetings"

"What should our priorities be this week based on our current metrics?"

"Draft an update email about our progress on Q4 goals"

## AI and Privacy

Your business data is private. Zentrix AI only accesses data you have permission to see.

Conversations with AI are not shared with other users unless you choose to share them.

## Best Practices

**Use AI as a Starting Point**: Let it draft, then you refine.

**Ask for Explanations**: "Explain why you recommend this approach"

**Experiment**: Try different types of questions to discover what AI can do.

**Combine with Your Judgment**: AI provides insights, you make decisions.`,
      },
      {
        slug: 'analytics-dashboard',
        title: 'Analytics Dashboard',
        description: 'Understanding your usage and engagement',
        estimatedMinutes: 5,
        contentType: 'article',
        pathSlug: 'ai-and-insights',
        content: `# Analytics Dashboard

The Analytics Dashboard provides visual insights into your team's performance across goals, metrics, meetings, tasks, and issues.

## Accessing Analytics

Navigate to **Analytics** from the sidebar to view your team's performance data.

## KPI Summary Cards

At the top of the page, you'll see four key metrics at a glance:

**Goals On-track & Completed**: Percentage of goals that are on track or already completed.

**Average Meeting Rating**: How team members rate meeting effectiveness over the last 7 days.

**Tasks Completed**: Number of tasks completed in the last 7 days.

**Issues Solved**: Number of issues resolved in the last 7 days.

**Tip**: Click any KPI card to drill down and see the detailed records behind that number.

## Available Charts

The dashboard provides multiple chart visualizations:

**Goals Analytics**: Track goal status trends over time (completed, on-track, off-track, canceled).

**Metrics Performance**: See how many metrics are hitting targets vs. missing them each period.

**Meeting Ratings**: Visualize average meeting ratings by week, month, or quarter.

**Task Completion**: Breakdown of tasks by completion status (on-time, late, overdue).

**Issues Solved**: Number of issues resolved per period.

**Tasks Created**: Tasks created during meetings over time.

**Average Resolution Time**: Average time spent resolving issues in meetings.

**Tasks Completed Over Time**: Historical task completion trends.

## Using Filters

Customize your view with three filter options:

**Frequency**: Choose between weekly, monthly, quarterly, or yearly views.

**Timeframe**: Select from last 4 weeks, 3 months, 6 months, 1 year, or all-time data.

**Team Filter**: View company-wide data or drill into specific teams to see their performance.

## Drill-Down Feature

Click any data point on a chart to see the actual records behind that number. For example:
- Click a goal status segment to see which specific goals are in that state
- Click a task completion bar to see which tasks were completed on-time vs. late
- Click a metrics data point to see which metrics hit or missed targets that week

## Best Practices

**Review Weekly**: Check analytics regularly to spot trends and identify areas needing attention.

**Compare Timeframes**: Switch between different timeframes to understand if performance is improving or declining.

**Use Team Filters**: Identify which teams are excelling and which need support.

**Click Through Drill-Downs**: Don't just look at numbers—click through to understand the "why" behind the metrics.

**Act on Insights**: Use analytics to guide your priorities and team conversations.`,
      },
    ],
  },
];

// Helper function to get all lessons
export const getAllLessons = (): LessonContent[] => {
  return learningPaths.flatMap(path => path.lessons);
};

// Helper function to get lesson by slug
export const getLessonBySlug = (slug: string): LessonContent | undefined => {
  return getAllLessons().find(lesson => lesson.slug === slug);
};

// Helper function to get path by slug
export const getPathBySlug = (slug: string): LearningPath | undefined => {
  return learningPaths.find(path => path.slug === slug);
};
