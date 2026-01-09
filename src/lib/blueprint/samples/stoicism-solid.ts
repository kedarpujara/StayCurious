import type { CourseBlueprint } from '@/types/blueprint'

export const stoicismSolidBlueprint: CourseBlueprint = {
  version: 2,
  topic: 'What is Stoicism?',
  depth: 'solid',
  steps: [
    {
      id: 'step_1',
      title: 'The Philosophy That Built Emperors',
      hook: "Picture this: a Roman emperor writing personal notes to himself about staying calm during wars, a slave becoming one of history's most influential teachers, and a businessman finding peace amid financial ruin. What did they all have in common? They practiced Stoicism, a 2,300-year-old philosophy that's more relevant today than ever. In our age of constant notifications, social media drama, and endless uncertainty, Stoicism offers something rare: a practical toolkit for inner peace and resilience that actually works.",
      keyIdea: {
        term: 'Stoicism',
        definition:
          'A practical philosophy focused on developing emotional resilience and wisdom by distinguishing between what we can and cannot control in life.',
        bullets: [
          'Founded in ancient Athens around 300 BCE by Zeno of Citium',
          'Emphasizes virtue, wisdom, and living in harmony with nature',
          'Teaches that happiness comes from within, not from external circumstances',
          "Provides concrete mental tools for handling life's challenges",
        ],
        nuance:
          "Despite the name, Stoicism isn't about being emotionless or passive - it's about responding thoughtfully rather than reacting impulsively.",
      },
      example: {
        scenario:
          "Imagine you're stuck in traffic, late for an important meeting. A typical reaction might be road rage, stress, and frustration. A Stoic approach would look different...",
        bullets: [
          'Recognize that the traffic is completely outside your control',
          'Focus energy on what you can control: calling ahead, using the time productively, staying calm',
          'Accept the situation without emotional resistance while taking practical action',
        ],
        connection:
          "This demonstrates the core Stoic principle of focusing mental energy only on what's within our power to influence.",
      },
      quickCheck: {
        type: 'multiple_choice',
        question: 'What is the main focus of Stoicism?',
        hint: 'Think about the traffic example - what made the Stoic response different?',
        choices: [
          { text: 'Avoiding all emotions and feelings', isCorrect: false },
          { text: 'Developing resilience by focusing on what we can control', isCorrect: true },
          { text: 'Achieving wealth and social status', isCorrect: false },
        ],
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'intro', difficulty: 'easy' },
    },
    {
      id: 'step_2',
      title: 'The Dichotomy of Control',
      hook: "If you could learn just one idea from Stoicism, this would be it. The dichotomy of control is so powerful that mastering it alone can transform how you experience daily life. It's the difference between feeling like a victim of circumstances and feeling empowered to navigate whatever comes your way.",
      keyIdea: {
        term: 'The Dichotomy of Control',
        definition:
          'The fundamental Stoic principle that divides all things into two categories: what is completely within our control and what is completely outside our control.',
        bullets: [
          'Things we control: our thoughts, judgments, decisions, and actions',
          "Things we don't control: other people, external events, outcomes, the past and future",
          'Wisdom means investing energy only in what we can actually influence',
          'This creates inner peace by eliminating futile struggles against unchangeable realities',
        ],
        nuance:
          'Some things seem partially controllable, but Stoics argue these are actually just areas where we control our input but not the outcome.',
      },
      example: {
        scenario:
          "You're applying for your dream job. You've prepared extensively, but you're anxious about whether you'll get it...",
        bullets: [
          'What you control: your preparation, interview performance, follow-up actions, and attitude',
          "What you don't control: the interviewer's mood, other candidates, company politics, or the final decision",
          'Stoic approach: Pour energy into preparation and performance, then mentally release attachment to the outcome',
        ],
        connection:
          'By focusing only on your controllable inputs, you perform better while avoiding the anxiety that comes from trying to control the uncontrollable.',
      },
      quickCheck: {
        type: 'multiple_choice',
        question: 'According to Stoicism, which of these is within your control?',
        hint: 'Think about what happens entirely inside your own mind and actions.',
        choices: [
          { text: 'Whether other people like you', isCorrect: false },
          { text: 'How you respond to criticism', isCorrect: true },
          { text: 'The weather during your vacation', isCorrect: false },
        ],
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_3',
      title: 'The Four Cardinal Virtues',
      hook: "While the dichotomy of control tells us where to focus our energy, the four cardinal virtues tell us how to use that energy wisely. These aren't abstract moral concepts gathering dust in philosophy books - they're practical character traits that the Stoics believed were the only true source of lasting happiness and fulfillment.",
      keyIdea: {
        term: 'The Four Cardinal Virtues',
        definition:
          'The four character traits that Stoics consider essential for human flourishing: wisdom, courage, justice, and temperance.',
        bullets: [
          'Wisdom: seeking truth, learning from experience, and making sound judgments',
          "Courage: facing challenges bravely and doing what's right despite fear or difficulty",
          'Justice: treating others fairly and contributing to the common good',
          'Temperance: practicing self-discipline and moderation in all things',
        ],
        nuance:
          'These virtues work together - courage without wisdom can be reckless, justice without temperance can become extremism.',
      },
      example: {
        scenario:
          "Your coworker takes credit for your idea in a team meeting. You're angry and want to publicly call them out...",
        bullets: [
          "Wisdom asks: What's really happening here and what's the best response?",
          'Courage gives you strength to address it appropriately, not avoid the conflict',
          'Justice seeks a fair resolution that protects both your interests and workplace harmony',
          'Temperance prevents you from overreacting or seeking revenge',
        ],
        connection:
          'Each virtue guides a different aspect of your response, creating a balanced approach that serves your long-term interests.',
      },
      quickCheck: {
        type: 'multiple_choice',
        question: 'Which virtue helps you avoid overreacting to provocations?',
        hint: 'Think about which virtue involves self-discipline and moderation.',
        choices: [
          { text: 'Wisdom', isCorrect: false },
          { text: 'Courage', isCorrect: false },
          { text: 'Temperance', isCorrect: true },
        ],
      },
      estimatedMinutes: 2,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_4',
      title: 'Daily Stoic Practices',
      hook: "Knowing Stoic principles is one thing, but living them is another. The ancient Stoics developed specific daily practices to train their minds like athletes train their bodies. These aren't just theoretical exercises - they're practical tools you can start using today to build mental resilience and clarity.",
      keyIdea: {
        term: 'Stoic Daily Practices',
        definition:
          'Concrete mental exercises and routines designed to strengthen wisdom, emotional resilience, and virtue in everyday life.',
        bullets: [
          "Morning reflection: planning how to apply virtues to the day's challenges",
          'Evening review: examining what went well, what could improve, and what you learned',
          'Negative visualization: imagining loss to increase gratitude and reduce attachment',
          'Pause and reframe: catching emotional reactions and choosing thoughtful responses',
        ],
        nuance:
          "These practices aren't about becoming perfect - they're about building the mental muscle memory to respond wisely under pressure.",
      },
      example: {
        scenario:
          "Every morning, Sarah spends 5 minutes thinking about her day ahead. She identifies potential challenges and mentally rehearses how she'll apply Stoic principles...",
        bullets: [
          'She anticipates a difficult client meeting and prepares to stay calm and solution-focused',
          "She reminds herself that she can't control the client's mood, only her own professionalism",
          'In the evening, she reflects on what happened and how she could handle similar situations better',
          'Over time, these micro-practices build her confidence and emotional stability',
        ],
        connection:
          'Regular practice transforms Stoic ideas from interesting concepts into automatic responses that serve you when life gets challenging.',
      },
      quickCheck: {
        type: 'multiple_choice',
        question: "What's the main purpose of negative visualization in Stoicism?",
        hint: 'Think about how imagining loss might change your appreciation for what you currently have.',
        choices: [
          { text: 'To make yourself feel pessimistic about life', isCorrect: false },
          { text: 'To increase gratitude and reduce attachment to outcomes', isCorrect: true },
          { text: 'To predict future problems accurately', isCorrect: false },
        ],
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'application', difficulty: 'medium' },
    },
    {
      id: 'step_5',
      title: 'Common Misconceptions About Stoicism',
      hook: "When most people hear 'Stoic,' they picture someone emotionless and cold, maybe saying 'just deal with it' when life gets tough. This couldn't be further from the truth. Real Stoicism is warm, engaged, and deeply human. Let's clear up these misunderstandings that keep people from accessing this powerful philosophy.",
      keyIdea: {
        term: 'Stoic Misconceptions vs Reality',
        definition:
          'The gap between popular stereotypes about Stoicism and what the philosophy actually teaches about living a full, engaged life.',
        bullets: [
          'Myth: Stoics are emotionless robots - Reality: Stoics feel deeply but respond thoughtfully',
          'Myth: Stoicism means passive acceptance - Reality: Stoics take vigorous action on what they can control',
          "Myth: It's about suppressing feelings - Reality: It's about not being controlled by temporary emotions",
          "Myth: Stoics don't care about others - Reality: Justice and service to community are core virtues",
        ],
        nuance:
          "The word 'stoic' in everyday language has drifted far from its philosophical origins, creating confusion about what the practice actually involves.",
      },
      example: {
        scenario:
          'When Marcus learns his project was cancelled after months of work, he feels disappointed and frustrated. But instead of dwelling in those emotions or lashing out...',
        bullets: [
          'He acknowledges his feelings without judgment - they are natural human responses',
          'He quickly shifts focus to what he can control: learning from the experience and finding new opportunities',
          'He maintains his relationships and reputation by responding professionally',
          'He uses the setback as training for resilience, knowing similar challenges will come',
        ],
        connection:
          'This shows authentic Stoicism - feeling emotions fully while not letting them drive destructive behaviors or cloud good judgment.',
      },
      quickCheck: {
        type: 'multiple_choice',
        question: 'According to true Stoicism, what should you do with difficult emotions?',
        hint: 'Think about the difference between feeling emotions and being controlled by them.',
        choices: [
          { text: 'Suppress them completely', isCorrect: false },
          { text: 'Let them guide all your decisions', isCorrect: false },
          { text: "Acknowledge them but don't let them control your actions", isCorrect: true },
        ],
      },
      estimatedMinutes: 2,
      metadata: { stepType: 'core', difficulty: 'easy' },
    },
    {
      id: 'step_6',
      title: 'Your Stoic Toolkit',
      hook: "You now have the foundation of a 2,300-year-old philosophy that has helped everyone from Roman emperors to modern entrepreneurs navigate life's challenges with grace and wisdom. But Stoicism isn't something you learn once and forget - it's a daily practice that grows stronger with use.",
      keyIdea: {
        term: 'Living Stoicism Today',
        definition:
          'The ongoing practice of applying Stoic principles to modern life, creating resilience, wisdom, and inner peace through daily application.',
        bullets: [
          'Focus daily on the dichotomy of control to reduce anxiety and increase effectiveness',
          'Cultivate the four virtues through conscious choices in how you treat others and yourself',
          'Use morning and evening reflections to stay aligned with your values',
          'Remember that Stoicism is about engagement, not withdrawal from life',
        ],
        nuance:
          'Stoicism is a lifelong practice, not a destination - even experienced practitioners continue learning and growing.',
      },
      example: {
        scenario:
          'Over six months of practicing Stoicism, Jamie notices profound changes in how she handles workplace stress, relationship conflicts, and personal setbacks...',
        bullets: [
          'She spends less mental energy worrying about things outside her control',
          'Her relationships improve because she responds thoughtfully rather than reactively',
          "She feels more confident taking on challenges because she's less attached to specific outcomes",
          'She experiences a deeper sense of peace even during difficult periods',
        ],
        connection:
          'These changes demonstrate how Stoic practice creates a positive feedback loop - better responses lead to better outcomes, which reinforces the value of the philosophy.',
      },
      quickCheck: {
        type: 'multiple_choice',
        question: "What's the most important thing to remember about practicing Stoicism?",
        hint: 'Think about how any skill develops with consistent practice over time.',
        choices: [
          { text: 'You must be perfect at it from the start', isCorrect: false },
          { text: 'It is a daily practice that develops over time', isCorrect: true },
          { text: 'It only works for certain types of people', isCorrect: false },
        ],
      },
      estimatedMinutes: 2,
      metadata: { stepType: 'summary', difficulty: 'easy' },
    },
  ],
  totalEstimatedMinutes: 15,
  generatedAt: '2026-01-09T10:28:44.000Z',
}
