import type { CourseBlueprint } from '@/types/blueprint'

export const alcoholHistoryBlueprint: CourseBlueprint = {
  version: 2,
  topic: 'The History of Alcohol',
  steps: [
    {
      id: 'step_1',
      title: 'The Accidental Discovery',
      hook: "Imagine a prehistoric human stumbling upon fallen fruit that had been sitting in a pool of water. They take a sip and feel... different. Warmer. Happier. This accidental discovery of fermentation predates written history and may be one of the oldest human discoveries – some archaeologists believe it even predates bread-making.",
      keyIdea: {
        term: 'Fermentation',
        definition:
          'The natural process where yeast converts sugars into alcohol and carbon dioxide. This happens spontaneously when wild yeast meets sugary liquids.',
        bullets: [
          'Fermentation can occur naturally without human intervention',
          'Ancient peoples discovered it by accident through rotting fruit or grain',
          'Evidence of intentional brewing dates back at least 13,000 years',
          'Some researchers believe the desire for alcohol drove the agricultural revolution',
        ],
        nuance:
          'The "beer before bread" hypothesis suggests humans may have settled down to farm primarily to produce alcohol, not food.',
      },
      example: {
        scenario:
          'At Göbekli Tepe in Turkey, archaeologists found massive stone vessels...',
        bullets: [
          'These 11,000-year-old vessels show chemical traces of fermented beverages',
          'The site predates agriculture, suggesting hunter-gatherers made alcohol',
          'Residue analysis found evidence of a fermented wheat-based drink',
        ],
        connection:
          'Before humans built cities or invented writing, they were already brewing.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'intro', difficulty: 'easy' },
    },
    {
      id: 'step_2',
      title: 'Ancient Civilizations and Sacred Drinks',
      hook: "For ancient civilizations, alcohol wasn't just a beverage – it was medicine, currency, religious sacrament, and social glue all rolled into one. The Sumerians had a goddess of beer, the Egyptians paid workers in ale, and wine flowed through Greek symposiums where philosophy was born.",
      keyIdea: {
        term: 'Sacred Intoxication',
        definition:
          'The widespread belief in ancient cultures that alcohol provided a connection to the divine or spiritual realm.',
        bullets: [
          '**Mesopotamia**: Ninkasi, the goddess of beer, had hymns written to her with brewing recipes',
          '**Egypt**: Workers building pyramids received daily beer rations (about 4 liters)',
          '**Greece**: Wine was central to religious rituals and philosophical discourse',
          '**China**: Rice wine (jiu) was used in ancestor worship for millennia',
        ],
        nuance:
          'Ancient beers were often thick, nutritious, and low in alcohol – more like liquid bread than modern beverages.',
      },
      example: {
        scenario:
          'The Hymn to Ninkasi, written around 1800 BCE, is both a prayer and a recipe...',
        bullets: [
          'It describes bappir (twice-baked barley bread) as a key ingredient',
          'The process involved mixing bread with water and letting it ferment',
          'Drinking was done through straws to filter out solid bits',
        ],
        connection:
          'This 4,000-year-old recipe has been recreated by modern brewers, proving these techniques actually worked.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_3',
      title: 'The Rise of Distillation',
      hook: "Wine and beer dominated for millennia, but around the 8th century, Arab alchemists discovered something revolutionary: distillation. By heating fermented liquids and capturing the vapor, they could concentrate alcohol into something far more powerful. The word 'alcohol' itself comes from the Arabic 'al-kuhl.'",
      keyIdea: {
        term: 'Distillation',
        definition:
          'The process of heating a liquid to create vapor, then cooling that vapor back into a more concentrated liquid. This separates alcohol from water.',
        bullets: [
          'Alcohol evaporates at a lower temperature than water (78°C vs 100°C)',
          'Arab alchemists developed the alembic still around 800 CE',
          'They called the result "al-kuhl" meaning "the essence"',
          'Distilled spirits were first used as medicine, not beverages',
        ],
        nuance:
          'Medieval Europeans called distilled alcohol "aqua vitae" (water of life), believing it had magical healing properties.',
      },
      example: {
        scenario:
          'In medieval monasteries, monks became master distillers...',
        bullets: [
          'Benedictine monks created herbal liqueurs as medicine',
          'Irish monks developed whiskey (uisce beatha – "water of life")',
          'These "medicinal" spirits were prescribed for everything from plague to toothaches',
        ],
        connection:
          'Many famous liquor brands today (like Bénédictine and Chartreuse) trace directly back to medieval monastery recipes.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_4',
      title: 'Alcohol and Empire',
      hook: "As European powers built global empires, alcohol traveled with them – and transformed in the process. Rum fueled the slave trade, whiskey sparked rebellion, gin caused urban crises, and wine shaped colonial economies. Alcohol became inseparable from power, economics, and exploitation.",
      keyIdea: {
        term: 'The Triangle Trade',
        definition:
          'The 18th-century trade network where rum, slaves, and molasses formed a devastating economic cycle across the Atlantic.',
        bullets: [
          'Caribbean sugar plantations produced molasses as a byproduct',
          'New England distilleries turned molasses into rum',
          'Rum was traded in Africa for enslaved people',
          'Enslaved people were shipped to the Caribbean to produce more sugar',
        ],
        nuance:
          'The American Revolution was partly triggered by British attempts to tax this rum trade with the Molasses Act of 1733.',
      },
      example: {
        scenario:
          'The Gin Craze of 1720s-1750s London shows alcohol\'s dark side...',
        bullets: [
          'Cheap gin flooded London after the government deregulated distilling',
          'By 1743, English people drank 10 liters of gin per person annually',
          'Mortality rates soared, birth rates plummeted, crime exploded',
          'It took multiple Gin Acts to bring the crisis under control',
        ],
        connection:
          'This was the first major "drug epidemic" in modern history and shaped how governments regulate substances today.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_5',
      title: 'Prohibition and Its Lessons',
      hook: "In 1920, the United States tried something unprecedented: banning alcohol entirely. The 'Noble Experiment' lasted 13 years and taught the world powerful lessons about law, morality, and unintended consequences. Prohibition didn't eliminate drinking – it transformed it.",
      keyIdea: {
        term: 'Prohibition',
        definition:
          'The nationwide constitutional ban on alcohol production, sale, and transport in the United States from 1920 to 1933 (18th Amendment).',
        bullets: [
          'The temperance movement had been building for nearly a century',
          'Alcohol consumption actually dropped initially – by about 30%',
          'But organized crime exploded to fill the demand',
          'Speakeasies, bootleggers, and rum-runners became cultural icons',
        ],
        nuance:
          'Prohibition had some genuine public health benefits (lower cirrhosis rates, less domestic violence) that are often overlooked in the narrative of failure.',
      },
      example: {
        scenario:
          'Al Capone built an empire on illegal alcohol...',
        bullets: [
          'His Chicago operation earned an estimated $60 million annually',
          'Violence between gangs killed over 500 people in Chicago alone',
          'Corruption reached the highest levels of government',
          'When Prohibition ended in 1933, organized crime simply moved to other businesses',
        ],
        connection:
          'Prohibition\'s failures continue to influence debates about drug policy and regulation today.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'application', difficulty: 'medium' },
    },
    {
      id: 'step_6',
      title: 'The Modern Era',
      hook: "Today, alcohol is a global industry worth over $1.5 trillion, yet our relationship with it remains complicated. Craft brewing revolutions, wine tourism, and cocktail culture flourish alongside growing awareness of addiction, health impacts, and changing social attitudes – especially among younger generations.",
      keyIdea: {
        term: 'The Shifting Landscape',
        definition:
          'The modern alcohol industry faces simultaneous trends of premiumization (people paying more for quality) and moderation (people drinking less overall).',
        bullets: [
          'Craft beer exploded from 89 US breweries in 1978 to over 9,000 today',
          'Non-alcoholic beverages are the fastest-growing drinks category',
          'Gen Z drinks 20% less than millennials did at the same age',
          'Wine regions are shifting due to climate change',
        ],
        nuance:
          'The phrase "sober curious" represents a cultural shift where not drinking is increasingly seen as a valid lifestyle choice, not an oddity.',
      },
      example: {
        scenario:
          'The rise of "dry January" and mindful drinking shows changing attitudes...',
        bullets: [
          'Participation in dry January grew from 4 million in 2013 to over 130 million in 2022',
          'Athletic Brewing, a non-alcoholic beer company, is now valued at over $500 million',
          'Many bars now feature extensive "zero-proof" cocktail menus',
        ],
        connection:
          'After 13,000 years, humanity\'s relationship with alcohol continues to evolve – and the next chapter is still being written.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'summary', difficulty: 'easy' },
    },
  ],
  totalEstimatedMinutes: 18,
  generatedAt: new Date().toISOString(),
}
