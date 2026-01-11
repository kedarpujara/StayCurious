import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { airplaneBlueprint } from '@/lib/blueprint/samples/airplanes'
import { alcoholHistoryBlueprint } from '@/lib/blueprint/samples/alcohol-history'

// Use service role for seeding
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Course configurations
const COURSES = [
  {
    blueprint: airplaneBlueprint,
    slug: 'how-airplanes-fly-solid-v2',
    description: 'Discover the fascinating physics behind flight - from lift and drag to how pilots control massive aircraft through the sky.',
    category: 'science',
    difficulty: 'beginner' as const,
    quiz_questions: {
      questions: [
        {
          id: 'q1',
          question: 'What is the primary reason a wing generates lift?',
          options: ['Air pushes up from below', 'Pressure difference between top and bottom of wing', 'Engines push the wing up', 'Wind blows the plane upward'],
          correctAnswer: 1,
          explanation: 'Lift is created by the pressure difference - faster air over the curved top creates lower pressure than the slower air below.',
        },
        {
          id: 'q2',
          question: 'Which of the Four Forces opposes the forward motion of an aircraft?',
          options: ['Lift', 'Weight', 'Thrust', 'Drag'],
          correctAnswer: 3,
          explanation: 'Drag is air resistance that opposes forward motion. Thrust must overcome drag to move forward.',
        },
        {
          id: 'q3',
          question: 'What are ailerons used for?',
          options: ['Controlling pitch (nose up/down)', 'Controlling roll (banking left/right)', 'Controlling yaw (turning left/right)', 'Increasing thrust'],
          correctAnswer: 1,
          explanation: 'Ailerons are on the wings and control roll - they make the aircraft bank left or right.',
        },
        {
          id: 'q4',
          question: 'How do jet engines create thrust?',
          options: ['By spinning propellers', 'By shooting hot exhaust gases backward', 'By creating a vacuum in front', 'By magnetic propulsion'],
          correctAnswer: 1,
          explanation: 'Jet engines compress air, mix it with fuel, ignite it, and shoot the hot exhaust backward. The reaction force pushes the plane forward (Newton\'s Third Law).',
        },
        {
          id: 'q5',
          question: 'For an aircraft to climb, which must be true?',
          options: ['Thrust must equal drag', 'Lift must exceed weight', 'Weight must exceed lift', 'Drag must exceed thrust'],
          correctAnswer: 1,
          explanation: 'To climb, lift must be greater than weight. This causes the net upward force that makes the aircraft rise.',
        },
      ],
    },
  },
  {
    blueprint: alcoholHistoryBlueprint,
    slug: 'history-of-alcohol-deep',
    description: 'Journey through 13,000 years of humanity\'s relationship with alcohol - from accidental fermentation to Prohibition to the modern craft revolution.',
    category: 'history',
    difficulty: 'intermediate' as const,
    quiz_questions: {
      questions: [
        {
          id: 'q1',
          question: 'What is fermentation?',
          options: ['Heating liquid to remove water', 'Yeast converting sugars into alcohol and CO2', 'Mixing alcohol with herbs', 'Aging drinks in wooden barrels'],
          correctAnswer: 1,
          explanation: 'Fermentation is the natural process where yeast converts sugars into alcohol and carbon dioxide.',
        },
        {
          id: 'q2',
          question: 'What does the "beer before bread" hypothesis suggest?',
          options: ['Beer was invented after bread', 'Humans settled to farm primarily to produce alcohol', 'Bread was made from beer ingredients', 'Beer and bread were invented simultaneously'],
          correctAnswer: 1,
          explanation: 'The hypothesis suggests the desire for alcohol may have driven the agricultural revolution, predating bread-making.',
        },
        {
          id: 'q3',
          question: 'Where does the word "alcohol" come from?',
          options: ['Latin "aqua vitae"', 'Greek "alcos"', 'Arabic "al-kuhl"', 'German "alkohol"'],
          correctAnswer: 2,
          explanation: 'The word comes from Arabic "al-kuhl" meaning "the essence," coined by Arab alchemists who developed distillation.',
        },
        {
          id: 'q4',
          question: 'What was the Triangle Trade?',
          options: ['A trade route between Europe, Asia, and Africa', 'A trade cycle of rum, slaves, and molasses across the Atlantic', 'A medieval European beer trading network', 'A prohibition-era smuggling operation'],
          correctAnswer: 1,
          explanation: 'The Triangle Trade was the devastating 18th-century cycle where rum, enslaved people, and molasses were traded across the Atlantic.',
        },
        {
          id: 'q5',
          question: 'How long did US Prohibition last?',
          options: ['5 years (1925-1930)', '13 years (1920-1933)', '20 years (1920-1940)', '8 years (1919-1927)'],
          correctAnswer: 1,
          explanation: 'Prohibition lasted 13 years from 1920 to 1933, when the 18th Amendment was repealed by the 21st.',
        },
        {
          id: 'q6',
          question: 'What happened to alcohol consumption during Prohibition?',
          options: ['It increased dramatically', 'It dropped initially but crime exploded', 'It remained exactly the same', 'It was completely eliminated'],
          correctAnswer: 1,
          explanation: 'Consumption initially dropped by about 30%, but organized crime exploded to meet remaining demand.',
        },
        {
          id: 'q7',
          question: 'The Hymn to Ninkasi is significant because:',
          options: ['It\'s the oldest love poem', 'It\'s a 4,000-year-old beer recipe disguised as a prayer', 'It describes wine-making techniques', 'It banned alcohol consumption'],
          correctAnswer: 1,
          explanation: 'Written around 1800 BCE, this Sumerian hymn to the beer goddess doubles as a detailed brewing recipe.',
        },
        {
          id: 'q8',
          question: 'What is the "sober curious" movement?',
          options: ['A pro-alcohol advocacy group', 'A trend where not drinking is seen as a valid lifestyle choice', 'A medieval temperance movement', 'A cocktail mixing technique'],
          correctAnswer: 1,
          explanation: 'Sober curious represents a cultural shift where abstaining or moderating alcohol is increasingly accepted and even trendy.',
        },
        {
          id: 'q9',
          question: 'What was aqua vitae?',
          options: ['A type of ancient wine', 'Latin term for distilled spirits meaning "water of life"', 'A Greek beer recipe', 'A non-alcoholic remedy'],
          correctAnswer: 1,
          explanation: 'Medieval Europeans called distilled alcohol "aqua vitae" (water of life), believing it had magical healing properties.',
        },
        {
          id: 'q10',
          question: 'How has Gen Z\'s drinking compare to previous generations?',
          options: ['They drink 20% more', 'They drink about the same', 'They drink 20% less than millennials at the same age', 'Data shows no difference'],
          correctAnswer: 2,
          explanation: 'Gen Z drinks about 20% less than millennials did at the same age, reflecting changing attitudes toward alcohol.',
        },
      ],
    },
  },
]

export async function POST(request: Request) {
  try {
    // Check for specific course parameter
    const url = new URL(request.url)
    const courseSlug = url.searchParams.get('course')

    const coursesToSeed = courseSlug
      ? COURSES.filter(c => c.slug === courseSlug || c.slug.includes(courseSlug))
      : COURSES

    if (coursesToSeed.length === 0) {
      return NextResponse.json({
        error: 'Course not found',
        available: COURSES.map(c => c.slug),
      }, { status: 404 })
    }

    const results = []

    for (const courseConfig of coursesToSeed) {
      // Check if course already exists by slug
      const { data: existingBySlug } = await supabase
        .from('course_catalog')
        .select('id')
        .eq('slug', courseConfig.slug)
        .single()

      if (existingBySlug) {
        results.push({
          slug: courseConfig.slug,
          status: 'exists',
          courseId: existingBySlug.id,
        })
        continue
      }

      // Also check by topic + source (unique constraint)
      const { data: existingByTopic } = await supabase
        .from('course_catalog')
        .select('id')
        .eq('topic', courseConfig.blueprint.topic)
        .eq('source', 'almanac')
        .single()

      if (existingByTopic) {
        // Update the existing course with new content
        const { data: updated, error: updateError } = await supabase
          .from('course_catalog')
          .update({
            slug: courseConfig.slug,
            content: courseConfig.blueprint,
            quiz_questions: courseConfig.quiz_questions,
            description: courseConfig.description,
            category: courseConfig.category,
            difficulty: courseConfig.difficulty,
            estimated_minutes: courseConfig.blueprint.totalEstimatedMinutes,
            section_count: courseConfig.blueprint.steps.length,
            schema_version: 2,
            generation_version: 2,
          })
          .eq('id', existingByTopic.id)
          .select()
          .single()

        if (updateError) {
          results.push({
            slug: courseConfig.slug,
            status: 'update_error',
            error: updateError.message,
          })
        } else {
          results.push({
            slug: courseConfig.slug,
            status: 'updated',
            courseId: updated.id,
          })
        }
        continue
      }

      // Insert the blueprint course
      const { data: course, error: insertError } = await supabase
        .from('course_catalog')
        .insert({
          topic: courseConfig.blueprint.topic,
          slug: courseConfig.slug,
          source: 'almanac',
          creator_type: 'system',
          content: courseConfig.blueprint,
          quiz_questions: courseConfig.quiz_questions,
          description: courseConfig.description,
          category: courseConfig.category,
          difficulty: courseConfig.difficulty,
          estimated_minutes: courseConfig.blueprint.totalEstimatedMinutes,
          section_count: courseConfig.blueprint.steps.length,
          schema_version: 2,
          is_vetted: true,
          is_featured: true,
          is_published: true,
          ai_provider: 'anthropic',
          generation_version: 2,
        })
        .select()
        .single()

      if (insertError) {
        results.push({
          slug: courseConfig.slug,
          status: 'error',
          error: insertError.message,
        })
      } else {
        results.push({
          slug: courseConfig.slug,
          status: 'created',
          courseId: course.id,
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
