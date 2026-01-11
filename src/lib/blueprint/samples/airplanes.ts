import type { CourseBlueprint } from '@/types/blueprint'

export const airplaneBlueprint: CourseBlueprint = {
  version: 2,
  topic: 'How Do Airplanes Fly?',
  steps: [
    {
      id: 'step_1',
      title: 'The Magic of Lift',
      hook: "Picture yourself holding your hand out of a car window as it speeds down the highway. Tilt your palm upward just slightly, and suddenly your hand wants to rise. You've just experienced the same fundamental force that lets a 400-ton airplane soar through the sky. This isn't magic – it's physics, and it's beautifully simple once you understand it.",
      keyIdea: {
        term: 'Lift',
        definition:
          'The upward force created when air moves faster over the top of a wing than the bottom, resulting in lower pressure above and higher pressure below.',
        bullets: [
          'Wings are curved on top and flatter on the bottom (this shape is called an airfoil)',
          'Air traveling over the curved top moves faster than air below',
          'Faster-moving air creates lower pressure (Bernoulli\'s principle)',
          'The pressure difference pushes the wing upward',
        ],
        nuance:
          'Lift isn\'t just about wing shape – the angle of the wing (angle of attack) is equally important and can generate lift even with a flat surface.',
      },
      example: {
        scenario:
          'Imagine blowing across the top of a piece of paper held horizontally. The paper rises! Here\'s what\'s happening...',
        bullets: [
          'Your breath creates fast-moving air across the top of the paper',
          'The still air below the paper has higher pressure',
          'The pressure difference pushes the paper upward – just like a wing',
        ],
        connection:
          'This simple experiment demonstrates the exact same principle that lifts a 747 into the sky.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'intro', difficulty: 'easy' },
    },
    {
      id: 'step_2',
      title: 'The Four Forces of Flight',
      hook: "Flying isn't just about lift – it's a delicate dance between four forces that must stay in balance. Every second an airplane is in the air, these forces are pushing and pulling against each other. Understanding them is the key to understanding everything about how planes fly.",
      keyIdea: {
        term: 'The Four Forces',
        definition:
          'Four forces act on every aircraft in flight: Lift (up), Weight (down), Thrust (forward), and Drag (backward).',
        bullets: [
          '**Lift** – the upward force from the wings that overcomes weight',
          '**Weight** – gravity pulling the aircraft down toward Earth',
          '**Thrust** – forward push from engines that overcomes drag',
          '**Drag** – air resistance that opposes forward motion',
        ],
        nuance:
          'In steady, level flight, these forces are perfectly balanced. But to climb, descend, speed up, or slow down, pilots intentionally create imbalances.',
      },
      example: {
        scenario:
          'Think about a plane taking off from a runway...',
        bullets: [
          'Engines create thrust that accelerates the plane forward',
          'As speed increases, air flows faster over the wings, generating more lift',
          'When lift exceeds weight, the plane rises off the ground',
          'Once airborne, the pilot adjusts thrust and lift to climb or level off',
        ],
        connection:
          'Every phase of flight – takeoff, cruise, landing – is about managing these four forces.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_3',
      title: 'How Wings Actually Work',
      hook: "Now let's zoom in on the most important part of an airplane – the wing. That elegant, curved shape didn't happen by accident. It's the result of over a century of refinement, and every curve and angle serves a specific purpose.",
      keyIdea: {
        term: 'Airfoil',
        definition:
          'The cross-sectional shape of a wing, designed to produce lift efficiently by creating different air pressures on its upper and lower surfaces.',
        bullets: [
          'The curved upper surface forces air to travel farther and faster',
          'The flatter bottom surface allows air to travel slower',
          'This speed difference creates a pressure difference',
          'Modern wings are optimized for specific speeds and purposes',
        ],
        nuance:
          'Fighter jets have thin, sharp wings for speed, while cargo planes have thick wings for maximum lift at lower speeds.',
      },
      example: {
        scenario:
          'Compare a paper airplane to a commercial jet wing...',
        bullets: [
          'A paper airplane uses flat surfaces and relies mostly on angle of attack',
          'A jet wing has a carefully designed curve that generates consistent lift',
          'The jet wing also has flaps and slats that change shape for different flight phases',
        ],
        connection:
          'The sophistication of the airfoil shape is why real planes can fly so efficiently.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_4',
      title: 'Engines: Creating Thrust',
      hook: "Without thrust, even the most perfectly designed wings are useless. Engines are the heart of an aircraft, and modern jet engines are engineering marvels that can produce enough power to push a massive airplane through the sky at near the speed of sound.",
      keyIdea: {
        term: 'Jet Propulsion',
        definition:
          'The principle that pushing air backward at high speed creates an equal and opposite force that propels the aircraft forward (Newton\'s Third Law).',
        bullets: [
          'Jet engines suck in air at the front and compress it',
          'Fuel is mixed with compressed air and ignited',
          'Hot exhaust gases shoot out the back at high speed',
          'The reaction force pushes the engine (and plane) forward',
        ],
        nuance:
          'Propeller planes use a different method – spinning blades that push air backward – but the underlying principle (Newton\'s Third Law) is the same.',
      },
      example: {
        scenario:
          'Imagine blowing up a balloon and letting it go...',
        bullets: [
          'Air rushes out the opening in one direction',
          'The balloon shoots off in the opposite direction',
          'This is exactly how jet engines work, just with controlled combustion instead of squeezed air',
        ],
        connection:
          'Every jet engine is essentially a controlled, continuous version of that balloon experiment.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'core', difficulty: 'medium' },
    },
    {
      id: 'step_5',
      title: 'Controlling the Aircraft',
      hook: "Generating lift and thrust gets you airborne, but how do pilots actually steer? Airplanes don't have wheels that turn like a car – they control direction by changing the shape of their wings and tail surfaces to redirect airflow.",
      keyIdea: {
        term: 'Control Surfaces',
        definition:
          'Movable parts on the wings and tail that change airflow to control the aircraft\'s pitch (up/down), roll (tilting), and yaw (left/right).',
        bullets: [
          '**Ailerons** on the wings control roll (banking left or right)',
          '**Elevators** on the tail control pitch (nose up or down)',
          '**Rudder** on the vertical tail controls yaw (turning left or right)',
          'Pilots coordinate all three for smooth, controlled flight',
        ],
        nuance:
          'Turning an airplane actually requires rolling into the turn, not just pointing the nose – that\'s why planes bank when they turn.',
      },
      example: {
        scenario:
          'When a pilot wants to turn left...',
        bullets: [
          'They move the control stick left, raising the right aileron and lowering the left',
          'This tilts (banks) the airplane to the left',
          'The lift force, now angled, pulls the plane in a curved path',
          'The rudder helps coordinate the turn smoothly',
        ],
        connection:
          'It\'s like leaning into a turn on a bicycle – the bank creates the turning force.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'application', difficulty: 'medium' },
    },
    {
      id: 'step_6',
      title: 'Putting It All Together',
      hook: "You now understand the fundamental forces and mechanisms that make flight possible. Let's bring it all together and see how these principles work in harmony during an actual flight.",
      keyIdea: {
        term: 'The Complete Picture',
        definition:
          'Flight is the continuous management of lift, weight, thrust, and drag through wing design, engine power, and control surface adjustments.',
        bullets: [
          'Takeoff: Thrust overcomes drag, speed generates lift, lift overcomes weight',
          'Cruise: All four forces balanced, efficient flight at altitude',
          'Descent: Reduce thrust, allow drag to slow, reduce lift to descend',
          'Landing: Flaps extend to increase lift at low speed, then brakes and reverse thrust',
        ],
        nuance:
          'Modern autopilot systems constantly adjust all these variables thousands of times per second for optimal flight.',
      },
      example: {
        scenario:
          'From pushback to touchdown, here\'s what keeps you aloft...',
        bullets: [
          'Engines spool up, providing thrust to accelerate down the runway',
          'At rotation speed (~150 mph), the pilot lifts the nose, increasing angle of attack',
          'Lift exceeds weight, and the plane climbs into the sky',
          'Throughout the flight, the pilot (or autopilot) constantly adjusts the four forces',
        ],
        connection:
          'Every flight you take is this beautiful physics ballet, playing out exactly as the Wright Brothers first discovered in 1903.',
      },
      estimatedMinutes: 3,
      metadata: { stepType: 'summary', difficulty: 'easy' },
    },
  ],
  totalEstimatedMinutes: 18,
  generatedAt: new Date().toISOString(),
}
