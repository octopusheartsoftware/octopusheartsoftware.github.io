// The class catalog. Each game draws 3 of these at random.
// Every class has 3 modules (articles + a 4-question quiz). Some modules come with a professor email
// that holds one quiz answer (the question marked fromEmail). Email types vary so it isn't always a correction:
//   correction  the reading has a typo (the question's "typo" option is the reading's wrong answer)
//   update      something changed since the reading was written
//   addendum    the professor forgot to include something
//   qa          the professor shares an answer to a classmate's question
//   guest       a recap of a guest speaker
// If a player took the quiz before the email arrived, a polite "regrade" reply appears.
// Placeholders filled in by the game: {player}, {due} (e.g. "Fri, Week 2"), {module}.

window.CONTENT_CLASSES = [
  {
    id: 'bask', code: 'BASK 101', title: 'Underwater Basket Weaving', color: '#3f8fb5',
    prof: { name: 'Dr. Maribel Wickerly', email: 'mwickerly@goosestate.edu', sign: 'Stay damp,<br>Dr. Wickerly' },
    welcome: {
      subject: 'Welcome to BASK 101!',
      body: `<p>Hi {player},</p><p>Welcome to Underwater Basket Weaving! Your first module is open on Noodle. The quiz closes {due}, and a new module opens right after. Please read the articles carefully; I write my quizzes from them.</p><p>Reply so I know you've seen this.</p>`,
      replies: [
        { text: `Thanks, Dr. Wickerly! I'll read the articles before the quiz.`, good: true },
        { text: 'who is this', note: 'Professors notice tone. A short, polite reply goes a long way.' },
        { text: 'Can I skip the quiz if I already know how to swim?', note: `The email already explained the quiz. Asking questions it answers shows you didn't read it.` }
      ]
    },
    logistics: {
      subject: 'Pool closed Thursday (quiz still due {due})',
      body: `<p>Hi all,</p><p>The campus pool is closed Thursday for a "kelp emergency," so there's no lab this week. The {module} quiz is <b>still due {due}</b>.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Got it. No lab Thursday, quiz still due. Thanks!', good: true },
        { text: 'So the quiz is moved too?', note: 'The subject line and the email both say the quiz is still due.' },
        { text: 'what is a kelp emergency', note: `Fair question, but it didn't confirm what she asked.` }
      ]
    },
    modules: [
      {
        title: 'Origins and Materials',
        articles: [
          {
            title: 'The Soggy Origins of Underwater Basket Weaving', author: 'Prof. Tobias Reedhollow, Goose State Press',
            body: `<p>Most historians agree that the first underwater basket was woven in <b>1847</b> by <b>Agatha Pemberwick</b> of the village of Lower Dripping. According to her diary, Pemberwick's rowboat sank in the middle of Lake Moist while she was carrying a bundle of reeds. Rather than swim to shore, she "simply carried on."</p>
<p>Her finished basket, now called the <b>Pemberwick Original</b>, held exactly eleven eggs and is displayed at the Museum of Damp Crafts.</p>
<p>The first meeting of the <b>Underwater Basket Weaving Guild</b> took place in <b>1863</b>, with fourteen members. Because modern diving gear did not yet exist, members wore helmets made from upturned copper teapots, a tradition the Guild still honors with its teapot-shaped trophy.</p>
<p>Pemberwick's greatest invention was the <b>Pemberwick Knot</b>, a looping twist that tightens as it gets wetter.</p>`
          },
          {
            title: `Materials of the Deep: A Beginner's Guide`, author: 'Dr. Maribel Wickerly',
            body: `<p>The traditional material is <b>kelp-reed</b>, a rubbery, bright-green stalk harvested from the shallow end of Lake Moist. Before weaving, kelp-reed must soak for <b>20 minutes</b> in lukewarm salt water so that it bends without snapping.</p>
<p>Every beginner needs one essential tool: the <b>gurgle hook</b>, a bent brass needle used to tighten each Pemberwick Knot. Never use a fork. The Guild banned forks in 1901 after the "Great Tangle," which no one likes to discuss.</p>
<p>Finally, remember the <b>Three Breaths Rule</b>: complete no more than three knots before surfacing for air.</p>`
          }
        ],
        questions: [
          { q: 'Who wove the first known underwater basket?', options: ['Bartholomew Sogg', 'Agatha Pemberwick', 'Tobias Reedhollow', 'Lady Brine of Lake Moist'], answer: 1 },
          { q: 'In what year did the Underwater Basket Weaving Guild first meet?', options: ['1847', '1863', '1901', '1874'], answer: 1 },
          { q: 'Which tool is used to tighten a Pemberwick Knot?', options: ['A fork', 'A copper teapot', 'A gurgle hook', 'A reed clamp'], answer: 2 },
          { q: 'How long must kelp-reed soak before weaving?', options: ['10 minutes', '20 minutes', '45 minutes', 'Overnight'], answer: 2, fromEmail: true, typo: 1 }
        ],
        email: {
          type: 'correction', subject: 'Correction to the Materials reading',
          body: `<p>Hi {player},</p><p>Quick correction before the quiz: "Materials of the Deep" says kelp-reed soaks for 20 minutes. That's a typo. The correct soaking time is <b>45 minutes</b>. The quiz uses the correct number.</p><p>Please reply to confirm you got this.</p>`,
          replies: [
            { text: 'Got it: 45 minutes, not 20. Thanks for the heads-up!', good: true },
            { text: 'So the quiz is canceled?', note: 'The email said nothing about canceling. Read the whole message before replying.' },
            { text: 'lol typos happen', note: `A casual reply to a professor's correction comes across as careless.` }
          ],
          regrade: 'Thanks! I already took the quiz, though. Could you regrade the soaking-time question?',
          lesson: `Professors' emails can hold quiz answers that aren't in the reading.`
        }
      },
      {
        title: 'Competitive Weaving',
        articles: [{
          title: 'The Soggy Cup: A Century of Competitive Weaving', author: 'Dr. Maribel Wickerly',
          body: `<p>Every spring since <b>1911</b>, the finest weavers in the world have gathered at <b>Lake Moist</b> for the <b>Soggy Cup</b>, the sport's most important competition. The winner takes home the famous teapot trophy and a lifetime supply of kelp-reed.</p>
<p>The record holder is <b>Ingrid Splashworth</b>, who completed <b>four baskets in 58 minutes</b> in 1979. Her secret, she later admitted, was "humming to the fish so they'd stop nibbling the reeds."</p>
<p>The Cup's strictest rule bans <b>dry weaving</b>: tying even a single knot above the surface means instant disqualification. In 1988, the favorite, Rufus Bramblewick, was disqualified after sneezing so hard he briefly surfaced mid-knot.</p>`
        }],
        questions: [
          { q: 'When was the first Soggy Cup held?', options: ['1863', '1911', '1979', '1988'], answer: 1 },
          { q: `What is Ingrid Splashworth's record?`, options: ['Four baskets in 58 minutes', 'Eleven baskets in one day', 'Three knots in one breath', 'Four baskets in 85 minutes'], answer: 0 },
          { q: 'What gets a weaver instantly disqualified from the Soggy Cup?', options: ['Humming to the fish', 'Using a gurgle hook', 'Dry weaving', 'Sneezing'], answer: 2 },
          { q: 'Where is the Soggy Cup held now?', options: ['Lake Moist', 'Lower Dripping', 'Gooseberry Falls Aquatic Center', 'The Museum of Damp Crafts'], answer: 2, fromEmail: true }
        ],
        email: {
          type: 'update', subject: 'Soggy Cup update',
          body: `<p>Hi {player},</p><p>One update to the reading: the Soggy Cup <b>moved from Lake Moist to the Gooseberry Falls Aquatic Center in 2019</b>, after the lake's fish formed a union. The quiz asks where it's held <i>now</i>.</p><p>Please reply to confirm.</p>`,
          replies: [
            { text: 'Got it, the Aquatic Center since 2019. Thanks!', good: true },
            { text: 'The fish have a union??', note: `Fair question, but it didn't confirm what she asked. Professors want to know you got the key point.` },
            { text: 'k', note: `One letter isn't much of a reply to your professor.` }
          ],
          regrade: 'Thanks! I already took that quiz. Could the Soggy Cup question be regraded, since this came out after?',
          lesson: `Updates from professors can change what's true in the reading.`
        }
      },
      {
        title: 'Weaving and Wildlife',
        articles: [{
          title: 'Sharing the Lake: Weavers and Their Neighbors', author: 'Dr. Maribel Wickerly',
          body: `<p>Underwater weavers are never alone. The most famous neighbor is the <b>Moist Lake eel</b>, which has a habit of "borrowing" gurgle hooks. Experienced weavers carry a <b>spare hook tied to their ankle</b>.</p>
<p>Weavers also respect the <b>Quiet Hour</b>, from 6 to 7 a.m., when the lake's snails hold their annual-but-also-daily migration. No weaving is allowed during the Quiet Hour.</p>
<p>The friendliest neighbor is the <b>basket crab</b>, which lives inside abandoned baskets. Guild rules say any basket left underwater for more than <b>three days</b> becomes the crab's legal property.</p>`
        }],
        questions: [
          { q: 'Why do experienced weavers tie a spare hook to their ankle?', options: ['For balance', 'Eels "borrow" gurgle hooks', 'Guild rules require it', 'To scare basket crabs'], answer: 1 },
          { q: 'When is the Quiet Hour?', options: ['Midnight to 1 a.m.', 'Noon to 1 p.m.', '6 to 7 a.m.', 'All of Sunday'], answer: 2 },
          { q: 'What happens during the Quiet Hour?', options: ['Snails migrate', 'Eels sleep', 'The Soggy Cup begins', 'Crabs build baskets'], answer: 0 },
          { q: 'When does an abandoned basket become a crab\'s legal property?', options: ['After one day', 'After three days', 'After a week', 'Never'], answer: 1 }
        ]
      }
    ]
  },
  {
    id: 'snak', code: 'SNAK 210', title: 'History of Competitive Snacking', color: '#c9813a',
    prof: { name: 'Prof. Desmond Crumb', email: 'dcrumb@goosestate.edu', sign: 'Crunchingly yours,<br>Prof. Crumb' },
    welcome: {
      subject: 'Welcome to SNAK 210',
      body: `<p>Hello {player},</p><p>Welcome to the History of Competitive Snacking. Module 1 is on Noodle, and its quiz closes {due}. Snacks are permitted during readings. Yodeling is not.</p><p>Please reply so I know you received this.</p>`,
      replies: [
        { text: 'Thanks, Professor Crumb! Excited for the class.', good: true },
        { text: 'can I yodel quietly', note: 'He was clear about the yodeling.' },
        { text: 'is there a textbook or can I skip', note: 'Asking to skip the work in your first reply makes a poor first impression.' }
      ]
    },
    logistics: {
      subject: 'Thursday lecture canceled (quiz still due {due})',
      body: `<p>Hello SNAK 210,</p><p>I'm judging a regional nacho tournament, so Thursday's lecture is <b>canceled</b>. The {module} quiz is <b>still due {due}</b>, as planned.</p><p>Please reply to confirm you've seen this.</p>`,
      replies: [
        { text: 'Got it, thanks for letting us know! Good luck at the tournament.', good: true },
        { text: 'No class = party 🎉🎉', note: 'Professors read replies. Keep it professional.' },
        { text: 'Does this mean the quiz is canceled too?', note: 'The subject line and the email both say the quiz is still due.' }
      ]
    },
    modules: [
      {
        title: 'The Pretzel Era',
        articles: [{
          title: 'The Great Pretzel Standoff of 1922', author: 'Prof. Desmond Crumb',
          body: `<p>On a humid August morning in <b>1922</b>, two champions faced each other across a table piled with pretzels: <b>Ida Munch</b> of Saltwick and <b>Ferris "The Jaw" Galloway</b>. The match lasted <b>nine hours</b>. By sunset, the pair had eaten 3,412 pretzels between them, and the judge, a nervous baker named <b>Clement Dough</b>, declared a tie because he had run out of pretzels.</p>
<p>The confusion led directly to the founding of the <b>International Snacking Federation (ISF)</b> the following year in the town of <b>Crumbleton</b>.</p>
<p>The ISF's first official rule is still known as the <b>Galloway Rule</b>: no competitor may eat while yodeling.</p>`
        }],
        questions: [
          { q: 'How long did the Great Pretzel Standoff last?', options: ['Three hours', 'Nine hours', 'Two days', '3,412 minutes'], answer: 1 },
          { q: 'Where was the International Snacking Federation founded?', options: ['Saltwick', 'Crumbleton', 'Lower Dripping', 'Gooseberry Falls'], answer: 1 },
          { q: 'What does the Galloway Rule forbid?', options: ['Eating while yodeling', 'Using both hands', 'Salted pretzels', 'Matches longer than nine hours'], answer: 0 },
          { q: 'What did Clement Dough do after the Standoff?', options: ['Joined the ISF', 'Opened a pretzel-free bakery', 'Challenged Ida Munch', 'Retired to Saltwick'], answer: 1, fromEmail: true }
        ],
        email: {
          type: 'qa', subject: 'Good question from a classmate',
          body: `<p>Hello everyone,</p><p>A student asked what became of Clement Dough, the judge. Great question! After the Standoff, Dough was so traumatized that he <b>opened the world's first pretzel-free bakery</b>. It's on the quiz, so now you all know.</p><p>Please reply to confirm you've read this.</p>`,
          replies: [
            { text: 'Thanks for sharing the answer! A pretzel-free bakery, got it.', good: true },
            { text: 'who asked that lol', note: `It doesn't matter who asked. The answer is what matters, and it's on the quiz.` },
            { text: 'Can you share answers to the other questions too?', note: 'Asking for quiz answers in a reply is not a good look.' }
          ],
          regrade: 'Thanks! I took the quiz before this email came out. Could that question be dropped for me?',
          lesson: `When a professor answers a classmate's question for everyone, it's for you too.`
        }
      },
      {
        title: 'The Cheese Puff Scandal',
        articles: [{
          title: 'Puffgate: The Cheese Puff Controversy of 1958', author: 'Prof. Desmond Crumb',
          body: `<p>By the 1950s, no one in snacking was more popular than <b>Mavis Crunchley</b>, the "Duchess of Dust," who won six straight cheese puff titles.</p>
<p>At the <b>1958</b> championship in Saltwick, a suspicious judge noticed that Crunchley's puffs were unusually fluffy. A search of her handbag turned up a <b>hair dryer</b>, which she had been using to "re-puff" stale snacks between rounds.</p>
<p>The scandal, known as <b>Puffgate</b>, led the ISF to pass the <b>Crunchley Clause</b>, banning all electrical appliances from the snacking floor. To this day, cheese puff competitors must show their orange fingertips to the judges before each round, a ritual called <b>the Dusting</b>.</p>`
        }],
        questions: [
          { q: `What was Mavis Crunchley's nickname?`, options: ['The Jaw', 'The Duchess of Dust', 'The Puff Queen', 'The Saltwick Snacker'], answer: 1 },
          { q: `What did the judges find in Crunchley's handbag?`, options: ['Extra puffs', 'A hair dryer', 'A yodeling permit', 'A fork'], answer: 1 },
          { q: 'What does the Crunchley Clause ban?', options: ['Stale snacks', 'Eating while yodeling', 'Electrical appliances on the snacking floor', 'Orange fingertips'], answer: 2 },
          { q: 'What is "the Dusting"?', options: ['Cleaning the snacking floor', 'Showing orange fingertips to the judges', 'A penalty for cheating', `Crunchley's retirement party`], answer: 1 }
        ]
      },
      {
        title: 'Snacking Goes Global',
        articles: [{
          title: 'The Long Lunch: Snacking at the World Games', author: 'Prof. Desmond Crumb',
          body: `<p>Competitive snacking joined the <b>World Leisure Games</b> in <b>1976</b>. The first event was the <b>Relay Nibble</b>, in which four teammates pass a single cracker, each taking exactly one bite.</p>
<p>The most dramatic final came in 1984, when the team from <b>Lower Crunchington</b> was disqualified because their anchor snacker <b>swallowed the cracker whole</b>, which the judges ruled "a non-nibble."</p>
<p>Today the most-watched event is <b>Slow Soup</b>, where the winner is the competitor who finishes a bowl of soup <b>last</b> without letting it go cold.</p>`
        }],
        questions: [
          { q: 'When did competitive snacking join the World Leisure Games?', options: ['1922', '1958', '1976', '1984'], answer: 2 },
          { q: 'How does the Relay Nibble work?', options: ['Four teammates share one cracker, one bite each', 'One snacker eats four crackers', 'Teams race to a snack table', 'Snackers nibble while running'], answer: 0 },
          { q: 'Why was Lower Crunchington disqualified in 1984?', options: ['Yodeling', 'Using a hair dryer', 'Their anchor swallowed the cracker whole', 'They finished too fast'], answer: 2 },
          { q: 'Who wins Slow Soup?', options: ['The fastest eater', 'Whoever finishes last without the soup going cold', 'Whoever spills least', 'The judges\' favorite'], answer: 1 }
        ]
      }
    ]
  },
  {
    id: 'clod', code: 'CLOD 150', title: 'Applied Cloud Psychology', color: '#7a6fc0',
    prof: { name: 'Dr. Stratos Okonkwo-Bell', email: 'sokonkwobell@goosestate.edu', sign: 'Dr. O-B' },
    welcome: {
      subject: 'Welcome to Cloud Psychology ☁️',
      body: `<p>Hi {player},</p><p>Welcome to CLOD 150! Clouds have feelings, and this semester you'll learn to respect them. Module 1 is open, and its quiz closes {due}.</p><p>A quick reply to confirm would be lovely.</p>`,
      replies: [
        { text: `Thanks, Dr. O-B! Looking forward to it.`, good: true },
        { text: 'clouds are just water tho', note: `Even if you're skeptical, arguing in your first reply isn't the move.` },
        { text: '☁️', note: `Cute, but it doesn't confirm anything.` }
      ]
    },
    logistics: {
      subject: 'Office hours moved (quiz still due {due})',
      body: `<p>Hi everyone,</p><p>This week's office hours are moving to the roof, because the clouds asked. The {module} quiz is <b>still due {due}</b>.</p><p>Reply to confirm, please.</p>`,
      replies: [
        { text: 'Got it, roof office hours, and the quiz is still due. Thanks!', good: true },
        { text: 'did the clouds really ask', note: `It didn't confirm the two things he asked about.` },
        { text: 'Can we push the quiz back since office hours moved?', note: 'He said the quiz is still due. Office hours moving does not change it.' }
      ]
    },
    modules: [
      {
        title: 'Cheerful Clouds',
        articles: [{
          title: 'Why Cumulus Clouds Are So Cheerful', author: 'Dr. Stratos Okonkwo-Bell',
          body: `<p>Cloud psychologists measure a cloud's mood using the <b>Puffiness Index</b>, a scale from 1 to 12 developed by <b>Dr. Wendolyn Fluff</b> in <b>1978</b>. The average cumulus cloud scores a <b>9</b>, which experts describe as "pleasantly smug."</p>
<p>Cirrus clouds, by contrast, score a 4. They are not sad. They are simply <b>aloof</b> and prefer not to be looked at directly.</p>
<p>The standard treatment for a low-scoring cloud is <b>affirmation shouting</b>: standing on a hill at least <b>40 feet</b> high and shouting compliments upward.</p>`
        }],
        questions: [
          { q: 'On the Puffiness Index, what does the average cumulus cloud score?', options: ['4', '7', '9', '12'], answer: 2 },
          { q: 'How does the reading describe cirrus clouds?', options: ['Sad', 'Aloof', 'Smug', 'Sulky'], answer: 1 },
          { q: 'How high must your hill be for affirmation shouting?', options: ['At least 12 feet', 'At least 40 feet', 'At least 100 feet', 'Any height works'], answer: 1 },
          { q: 'In what year was the Puffiness Index created?', options: ['1968', '1978', '1987', '1999'], answer: 2, fromEmail: true, typo: 1 }
        ],
        email: {
          type: 'correction', subject: 'Typo in "Why Cumulus Clouds Are So Cheerful"',
          body: `<p>Hi everyone,</p><p>A sharp-eyed student noticed a typo: Dr. Fluff created the Puffiness Index in <b>1987</b>, not 1978. The quiz uses the correct year.</p><p>Reply to confirm, please.</p>`,
          replies: [
            { text: 'Thanks for the correction: 1987!', good: true },
            { text: 'lol who cares', note: 'Your professor cares, and so does the quiz.' },
            { text: 'Can you just send us the quiz answers?', note: `Asking for answers in a reply to a correction isn't a good look.` }
          ],
          regrade: 'Thank you! I took the quiz before this arrived. Could you regrade the Puffiness Index question?',
          lesson: 'Corrections from professors override the reading.'
        }
      },
      {
        title: 'Moody Clouds',
        articles: [{
          title: 'When Clouds Get Moody: The Nimbostratus Sulk', author: 'Rhea Overcast, Journal of Atmospheric Feelings',
          body: `<p>The nimbostratus is the most emotionally complex cloud. When upset, it enters a <b>sulk</b>: a gray, drizzly state that lasts an average of <b>three days</b>.</p>
<p>The most common trigger is <b>being ignored by airplanes</b>, which fly straight through without a word. Thunderstorms, despite their reputation, are rarely sulks. They are closer to <b>"loud venting."</b></p>
<p>The best-known remedy is the <b>Drizzle Lullaby</b>, composed in <b>1932</b> by the harpist <b>Ottoline Gray</b>. Played on a kazoo, it can shorten a sulk to a single afternoon.</p>`
        }],
        questions: [
          { q: 'How long does the average nimbostratus sulk last?', options: ['One afternoon', 'Three days', 'A week', 'Until it rains'], answer: 1 },
          { q: 'What most commonly triggers a nimbostratus sulk?', options: ['Being ignored by airplanes', 'Thunderstorms', 'Affirmation shouting', 'Trombones'], answer: 0 },
          { q: 'According to researchers, thunderstorms are closer to what?', options: ['Sulking', 'Loud venting', 'Being aloof', 'Pleasant smugness'], answer: 1 },
          { q: 'Who composed the Drizzle Lullaby?', options: ['Wendolyn Fluff', 'Rhea Overcast', 'Ottoline Gray', 'Barnaby Mist'], answer: 2 }
        ]
      },
      {
        title: 'Fog',
        articles: [{
          title: 'Fog: The Cloud That Lay Down', author: 'Dr. Stratos Okonkwo-Bell',
          body: `<p>Fog is simply a cloud that has <b>lain down</b>. Most cloud psychologists believe fog suffers from low self-esteem, which is why it hugs the ground and avoids eye contact with mountains.</p>
<p>In <b>1991</b>, Dr. Fluff's former student <b>Barnaby Mist</b> founded the <b>Fog Encouragement Society</b> in the town of <b>Murkwell</b>. Members discovered that fog does not respond to shouting at all. It only responds to <b>whispering</b>.</p>
<p>The Society's greatest achievement is <b>Fog Appreciation Week</b>, held every <b>November</b>.</p>`
        }],
        questions: [
          { q: 'According to the reading, what is fog?', options: ['A sulking nimbostratus', 'A cloud that has lain down', 'A cirrus cloud in disguise', 'Steam from Lake Moist'], answer: 1 },
          { q: 'Who founded the Fog Encouragement Society?', options: ['Wendolyn Fluff', 'Barnaby Mist', 'Ottoline Gray', 'Rhea Overcast'], answer: 1 },
          { q: 'How do you communicate with fog?', options: ['Shouting from a 40-foot hill', 'Playing a kazoo', 'Whispering', 'Avoiding eye contact'], answer: 2 },
          { q: 'When is Fog Appreciation Week?', options: ['Every March', 'Every November', 'Every spring', `Whenever it's foggy`], answer: 1 }
        ]
      }
    ]
  },
  {
    id: 'honk', code: 'HONK 101', title: 'Introduction to Goose Linguistics', color: '#4f8a5b',
    prof: { name: 'Dr. Agnes Featherstone', email: 'afeatherstone@goosestate.edu', sign: 'Honk regards,<br>Dr. Featherstone' },
    welcome: {
      subject: 'Welcome to HONK 101',
      body: `<p>Dear {player},</p><p>Welcome to Goose Linguistics, the study of what geese are actually saying (mostly complaints). Module 1 is ready on Noodle, and its quiz closes {due}.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Thank you, Dr. Featherstone! I got it.', good: true },
        { text: 'HONK', note: `Funny, but a professor asked you to confirm, not to practice.` },
        { text: 'is this a real class', note: `It's on your schedule, so yes. Questioning it in a reply isn't a great start.` }
      ]
    },
    logistics: {
      subject: 'Field trip reminder (quiz still due {due})',
      body: `<p>Dear class,</p><p>Saturday's field trip to the Mallard Park pond is optional, and please do not bring bread. The {module} quiz is <b>still due {due}</b>.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Got it, thanks! No bread, and the quiz is still due.', good: true },
        { text: 'can I bring crackers instead', note: `It didn't confirm the quiz deadline, which is what she asked about.` },
        { text: `If it's optional, is the quiz optional too?`, note: 'The email says the quiz is still due.' }
      ]
    },
    modules: [
      {
        title: 'The Basic Honk',
        articles: [{
          title: 'Not Just Noise: The Five Basic Honks', author: 'Dr. Agnes Featherstone',
          body: `<p>Linguists recognize <b>five basic honks</b>. The most common is the <b>short honk</b>, which means "excuse me" or, more often, "move."</p>
<p>The <b>double honk</b> is a greeting between friends. The <b>long honk</b>, which can last up to <b>four seconds</b>, is a complaint, usually about the weather or about other geese.</p>
<p>The rarest is the <b>silent honk</b>, in which a goose opens its beak and makes no sound at all. Researchers believe it means "I am too disappointed to honk."</p>
<p>The field was founded in <b>1952</b> by <b>Professor Ludwig Quillsby</b>, who spent eleven years living with a flock in a hollowed-out canoe.</p>`
        }],
        questions: [
          { q: 'What does the short honk usually mean?', options: ['Hello, friend', 'Move', 'I am disappointed', 'Danger'], answer: 1 },
          { q: 'What does the double honk mean?', options: ['A complaint', 'A greeting between friends', 'A warning', 'Goodbye'], answer: 1 },
          { q: 'What do researchers think the silent honk means?', options: ['"I am too disappointed to honk"', '"I am hungry"', '"Follow me"', '"I lost my voice"'], answer: 0 },
          { q: 'Who founded goose linguistics?', options: ['Agnes Featherstone', 'Ludwig Quillsby', 'Barnaby Mist', 'Agatha Pemberwick'], answer: 1 }
        ]
      },
      {
        title: 'Regional Dialects',
        articles: [{
          title: 'Honks of the North, Honks of the South', author: 'Dr. Agnes Featherstone',
          body: `<p>Geese from different regions honk differently. Northern geese use a <b>clipped honk</b>, while southern geese add a <b>gentle wobble</b> at the end.</p>
<p>The most unusual dialect belongs to the <b>Gooseberry Falls flock</b>, which honks in a pattern of <b>three</b>. Locals call it "the Gooseberry Waltz."</p>
<p>When geese from different regions meet, they often fall back on <b>head bobbing</b>, which works across all dialects.</p>`
        }],
        questions: [
          { q: 'How do southern geese honk differently?', options: ['They honk faster', 'They add a gentle wobble at the end', 'They only use silent honks', 'They honk in threes'], answer: 1 },
          { q: 'What pattern does the Gooseberry Falls flock honk in?', options: ['Pairs', 'Threes', 'Fives', 'One long honk'], answer: 1 },
          { q: 'What do geese use when their dialects don\'t match?', options: ['Wing flaps', 'Head bobbing', 'The long honk', 'Silence'], answer: 1 },
          { q: 'According to the guest speaker, how many honks does a gosling learn in its first month?', options: ['One', 'Five', 'Twelve', 'Forty'], answer: 2, fromEmail: true }
        ],
        email: {
          type: 'guest', subject: 'Recap: guest talk on gosling speech',
          body: `<p>Dear class,</p><p>Thank you to everyone who came to Dr. Penelope Down's guest talk! For those who missed it, her key finding: a gosling learns <b>twelve distinct honks in its first month</b>, more than most adult geese ever use. Yes, this will be on the quiz.</p><p>Please reply to confirm you've read the recap.</p>`,
          replies: [
            { text: 'Thanks for the recap! Twelve honks in the first month, noted.', good: true },
            { text: `I didn't go, does that matter?`, note: 'The recap exists so it doesn\'t matter. Confirming you read it is what she asked.' },
            { text: 'twelve seems like a lot', note: `An opinion isn't a confirmation.` }
          ],
          regrade: 'Thanks! I already took the quiz before this recap. Could that question be dropped for me?',
          lesson: 'Guest lectures count. Recaps are how professors share what you missed.'
        }
      },
      {
        title: 'Honks in History',
        articles: [{
          title: 'The Honk That Saved the Harbor', author: 'Prof. Ludwig Quillsby (reprint)',
          body: `<p>On a foggy night in <b>1899</b>, a goose named <b>Admiral Waddle</b> honked continuously for <b>two hours</b>, warning a fishing boat away from the rocks of Gooseberry Harbor.</p>
<p>The grateful town built a statue of Admiral Waddle, which still stands at the harbor. Every year on <b>March 3</b>, residents gather for <b>Waddle Day</b> and honk once at sunset.</p>
<p>Historians debate whether Admiral Waddle was warning the boat or simply complaining about the fog. Most agree it does not matter.</p>`
        }],
        questions: [
          { q: 'What year did Admiral Waddle save the boat?', options: ['1852', '1899', '1952', '1991'], answer: 1 },
          { q: 'How long did Admiral Waddle honk?', options: ['Four seconds', 'Ten minutes', 'Two hours', 'All night'], answer: 2 },
          { q: 'When is Waddle Day?', options: ['January 1', 'March 3', 'November 12', 'The first foggy night'], answer: 1 },
          { q: 'What do historians debate?', options: ['Whether the statue is accurate', 'Whether Waddle was warning the boat or complaining about the fog', 'What year it happened', 'Whether Waddle was a duck'], answer: 1 }
        ]
      }
    ]
  },
  {
    id: 'sock', code: 'SOCK 305', title: 'The Economics of Missing Socks', color: '#b05a7a',
    prof: { name: 'Prof. Reginald Threadgill', email: 'rthreadgill@goosestate.edu', sign: 'Best,<br>Prof. Threadgill' },
    welcome: {
      subject: 'SOCK 305: Welcome and first module',
      body: `<p>Hello {player},</p><p>Welcome to the Economics of Missing Socks. Every year, billions of socks vanish without explanation. This semester, we follow the money. Module 1 is open, and its quiz closes {due}.</p><p>Kindly reply to confirm.</p>`,
      replies: [
        { text: 'Thank you, Professor! Confirmed.', good: true },
        { text: 'i have like 4 missing socks rn', note: `Relatable, but it doesn't confirm anything.` },
        { text: 'Is this an easy A?', note: 'Asking about an easy grade in your first email sets the wrong tone.' }
      ]
    },
    logistics: {
      subject: 'Laundry lab rescheduled (quiz still due {due})',
      body: `<p>Hello all,</p><p>The laundry lab is rescheduled to next week because the dryer "ate the syllabus." The {module} quiz is <b>still due {due}</b>.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Confirmed, lab next week and the quiz is still due. Thanks!', good: true },
        { text: 'the dryer did WHAT', note: `It didn't confirm the deadline, which is what he asked about.` },
        { text: 'Does the quiz move with the lab?', note: 'The subject line and the email both say the quiz is still due.' }
      ]
    },
    modules: [
      {
        title: 'Where Do Socks Go?',
        articles: [{
          title: 'The Great Disappearance: Measuring Sock Loss', author: 'Prof. Reginald Threadgill',
          body: `<p>Economists estimate that the average household loses <b>15 socks per year</b>. The first serious study of sock loss was published in <b>1964</b> by <b>Dr. Hosiery Plum</b>, who tracked 300 families for two years.</p>
<p>Plum found that <b>left socks</b> go missing twice as often as right socks, a puzzle known as <b>Plum's Paradox</b>.</p>
<p>The leading theory blames the <b>dryer</b>, but a minority of economists believe socks are simply <b>"seeking better opportunities."</b></p>`
        }],
        questions: [
          { q: 'How many socks does the average household lose per year?', options: ['5', '15', '50', '300'], answer: 1 },
          { q: 'Who published the first serious study of sock loss?', options: ['Reginald Threadgill', 'Hosiery Plum', 'Ludwig Quillsby', 'Mavis Crunchley'], answer: 1 },
          { q: `What is Plum's Paradox?`, options: ['Socks shrink in the wash', 'Left socks go missing twice as often as right socks', 'Socks reappear after a year', 'Dryers eat only blue socks'], answer: 1 },
          { q: 'Where do most "lost" socks actually end up, according to the newer survey?', options: ['In the dryer', 'Under the bed', 'Stuck inside fitted sheets', 'Seeking better opportunities'], answer: 2, fromEmail: true }
        ],
        email: {
          type: 'addendum', subject: 'One thing I forgot to include',
          body: `<p>Hello all,</p><p>I forgot to add something to the reading. A newer survey (2021) found that most "lost" socks are actually <b>stuck inside fitted sheets</b>. The quiz asks about this.</p><p>Please reply to confirm you've seen it.</p>`,
          replies: [
            { text: 'Thanks for adding that: fitted sheets!', good: true },
            { text: 'I KNEW IT', note: `Enthusiastic, but it isn't a confirmation.` },
            { text: 'Can you update the reading instead of emailing?', note: `Telling a professor how to do their job isn't a great reply.` }
          ],
          regrade: 'Thanks! I took the quiz before this was added. Could that question be dropped for me?',
          lesson: 'Sometimes the email has information the reading left out.'
        }
      },
      {
        title: 'The Sock Market',
        articles: [{
          title: 'Supply, Demand and the Single Sock', author: 'Prof. Reginald Threadgill',
          body: `<p>When a sock goes missing, its partner becomes a <b>"widow sock."</b> The market for widow socks is enormous: an estimated <b>40 million</b> sit in drawers across the country.</p>
<p>In <b>1987</b>, an entrepreneur named <b>Dolores Mismatch</b> opened the first <b>Sock Exchange</b>, where people could trade widow socks. It closed after six months because nobody could agree on what "matching" meant.</p>
<p>Today, economists use the <b>Drawer Index</b> to measure how many unmatched socks a household is willing to tolerate before buying new ones. The national average is <b>seven</b>.</p>`
        }],
        questions: [
          { q: 'What is a "widow sock"?', options: ['A black sock', 'A sock whose partner went missing', 'A very old sock', 'A sock from the Sock Exchange'], answer: 1 },
          { q: 'Who opened the first Sock Exchange?', options: ['Hosiery Plum', 'Dolores Mismatch', 'Reginald Threadgill', 'Ida Munch'], answer: 1 },
          { q: 'Why did the Sock Exchange close?', options: ['It ran out of socks', 'Nobody could agree on what "matching" meant', 'Dryers were banned', 'It moved online'], answer: 1 },
          { q: 'What is the national average on the Drawer Index?', options: ['Three', 'Seven', 'Fifteen', 'Forty'], answer: 1 }
        ]
      },
      {
        title: 'Sock Policy',
        articles: [{
          title: 'Can Government Stop Sock Loss?', author: 'Prof. Reginald Threadgill',
          body: `<p>In <b>2003</b>, the town of <b>Pairsville</b> passed the first <b>Sock Accountability Act</b>, requiring every laundromat to post a "lost and found" bin. Sock losses fell by <b>12 percent</b>.</p>
<p>Critics argued the law simply moved lost socks from homes to laundromats. Supporters replied that at least people now knew where to look.</p>
<p>The most radical proposal, <b>Mandatory Clips</b>, would require every pair of socks to be clipped together before washing. It has never passed, mostly due to the "clip lobby."</p>`
        }],
        questions: [
          { q: 'What did the Sock Accountability Act require?', options: ['Clipping socks together', 'A lost-and-found bin at every laundromat', 'A tax on socks', 'Matching socks only'], answer: 1 },
          { q: 'By how much did sock losses fall in Pairsville?', options: ['5 percent', '12 percent', '40 percent', 'They rose'], answer: 1 },
          { q: `What was critics' main argument?`, options: ['It was too expensive', 'It moved lost socks to laundromats', 'It banned dryers', 'It was unconstitutional'], answer: 1 },
          { q: 'Why has Mandatory Clips never passed?', options: ['The "clip lobby"', 'It was too popular', 'Socks are too slippery', 'Dolores Mismatch opposed it'], answer: 0 }
        ]
      }
    ]
  },
  {
    id: 'nap', code: 'NAP 110', title: 'Competitive Napping Theory', color: '#5b6fa8',
    prof: { name: 'Dr. Lulu Snorrington', email: 'lsnorrington@goosestate.edu', sign: 'Rest well,<br>Dr. Snorrington' },
    welcome: {
      subject: 'Welcome to NAP 110 😴',
      body: `<p>Hi {player},</p><p>Welcome to Competitive Napping Theory! Despite the name, this class requires reading. Module 1 is open, and its quiz closes {due}.</p><p>Please reply when you're awake.</p>`,
      replies: [
        { text: 'Got it, thank you! Excited for this class.', good: true },
        { text: 'zzz', note: `She asked for a reply when you're awake. This doesn't count.` },
        { text: 'can napping count as studying', note: 'Not the question to lead with.' }
      ]
    },
    logistics: {
      subject: 'Nap lab moved (quiz still due {due})',
      body: `<p>Hi everyone,</p><p>This week's nap lab moves to the library's quiet room, since our usual room is "too comfortable." The {module} quiz is <b>still due {due}</b>.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Confirmed! Quiet room, and the quiz is still due.', good: true },
        { text: 'how can a room be too comfortable', note: `Curious, but it didn't confirm anything.` },
        { text: 'Does the quiz move with the lab?', note: 'The email says it is still due.' }
      ]
    },
    modules: [
      {
        title: 'Rules of the Nap',
        articles: [{
          title: 'From Hammock to Arena: The Rules of Competitive Napping', author: 'Dr. Lulu Snorrington',
          body: `<p>Competitive napping began in <b>1931</b> when two farmers in <b>Dozeborough</b> argued over who could nap better. The match lasted until both woke up and forgot the argument.</p>
<p>Modern matches are scored by three judges on <b>speed of falling asleep</b>, <b>stillness</b> and <b>"peacefulness of expression."</b> A perfect score is <b>30</b>.</p>
<p>Snoring is allowed, but <b>talking in your sleep</b> costs two points, because judges consider it "showing off."</p>`
        }],
        questions: [
          { q: 'Where did competitive napping begin?', options: ['Dozeborough', 'Crumbleton', 'Murkwell', 'Pairsville'], answer: 0 },
          { q: 'Which of these is NOT a judging category?', options: ['Speed of falling asleep', 'Stillness', 'Loudness of snoring', 'Peacefulness of expression'], answer: 2 },
          { q: 'What is a perfect score?', options: ['10', '24', '30', '100'], answer: 2 },
          { q: 'Why does talking in your sleep cost points?', options: ['It wakes the judges', 'Judges consider it "showing off"', 'It breaks stillness', 'It is too loud'], answer: 1 }
        ]
      },
      {
        title: 'Famous Nappers',
        articles: [{
          title: 'Legends of the Pillow', author: 'Dr. Lulu Snorrington',
          body: `<p>The greatest napper of all time is <b>Bartholomew Yawnsley</b>, who fell asleep in <b>four seconds</b> at the 1966 championship, a record that still stands.</p>
<p>His rival, <b>Pearl Dreamwell</b>, was famous for napping in unusual places, including a moving bus, a bell tower and, once, a <b>trampoline</b>.</p>
<p>Yawnsley retired in 1971 after a match in which he slept through his own victory ceremony.</p>`
        }],
        questions: [
          { q: 'How fast did Bartholomew Yawnsley fall asleep in 1966?', options: ['Four seconds', 'Thirty seconds', 'One minute', 'Four minutes'], answer: 0 },
          { q: 'Which unusual place did Pearl Dreamwell NOT nap in, according to the reading?', options: ['A moving bus', 'A bell tower', 'A trampoline', 'A canoe'], answer: 3 },
          { q: 'Why did Yawnsley retire?', options: ['An injury', 'He slept through his own victory ceremony', 'He lost to Pearl Dreamwell', 'He couldn\'t fall asleep anymore'], answer: 1 },
          { q: `What is Pearl Dreamwell's favorite pillow, according to Dr. Snorrington's email?`, options: ['A rolled-up towel', 'A bag of marshmallows', 'A feather pillow', 'No pillow at all'], answer: 1, fromEmail: true }
        ],
        email: {
          type: 'qa', subject: 'Re: question about Pearl Dreamwell',
          body: `<p>Hi everyone,</p><p>A student asked what pillow Pearl Dreamwell used. I checked: she always napped on <b>a bag of marshmallows</b>, which she called "the cloud that travels." It's a fun detail, and it's on the quiz.</p><p>Please reply to confirm.</p>`,
          replies: [
            { text: 'Thanks for checking! Marshmallows, noted.', good: true },
            { text: 'did she eat them after', note: `Curious, but it isn't a confirmation.` },
            { text: 'Why is a pillow on the quiz?', note: 'Arguing about the quiz content in a reply doesn\'t help you.' }
          ],
          regrade: `Thanks! I'd already taken the quiz. Could that question be dropped for me?`,
          lesson: `When a professor answers a classmate's question for everyone, it's for you too.`
        }
      },
      {
        title: 'The Science of Rest',
        articles: [{
          title: 'The 20-Minute Question', author: 'Dr. Lulu Snorrington',
          body: `<p>Nap researchers agree that the ideal nap lasts about <b>20 minutes</b>. Longer naps risk <b>"nap fog,"</b> a groggy feeling first described by <b>Dr. Ivan Slumberg</b> in <b>1979</b>.</p>
<p>Slumberg also invented the <b>Coffee Nap</b>: drink a cup of coffee, then nap immediately. The caffeine arrives just as you wake up.</p>
<p>Competitive nappers avoid naps after <b>4 p.m.</b>, which they call "stealing from tonight."</p>`
        }],
        questions: [
          { q: 'How long is the ideal nap, according to the reading?', options: ['5 minutes', '20 minutes', '90 minutes', '2 hours'], answer: 1 },
          { q: 'What is "nap fog"?', options: ['Fog that makes you sleepy', 'A groggy feeling after a long nap', 'A napping competition', 'A snoring sound'], answer: 1 },
          { q: 'How does a Coffee Nap work?', options: ['Drink coffee, then nap right away', 'Nap, then drink coffee', 'Nap in a coffee shop', 'Skip the nap and drink coffee'], answer: 0 },
          { q: 'What do competitive nappers call napping after 4 p.m.?', options: ['Nap fog', 'Stealing from tonight', 'The Coffee Nap', 'Overtime'], answer: 1 }
        ]
      }
    ]
  },
  {
    id: 'gnom', code: 'GNOM 240', title: 'Garden Gnome Anthropology', color: '#a8553a',
    prof: { name: 'Dr. Thaddeus Mossbottom', email: 'tmossbottom@goosestate.edu', sign: 'Yours in the garden,<br>Dr. Mossbottom' },
    welcome: {
      subject: 'GNOM 240 begins!',
      body: `<p>Greetings {player},</p><p>Welcome to Garden Gnome Anthropology, where we study the culture of the small, bearded and ceramic. Module 1 is open, and its quiz closes {due}.</p><p>A reply to confirm would be appreciated.</p>`,
      replies: [
        { text: 'Thank you, Dr. Mossbottom! Confirmed.', good: true },
        { text: 'gnomes are creepy tbh', note: 'Maybe save that for class discussion.' },
        { text: 'Do we have to read everything?', note: 'Yes. Asking that in your first reply sets the wrong tone.' }
      ]
    },
    logistics: {
      subject: 'Dig site closed (quiz still due {due})',
      body: `<p>Greetings,</p><p>The campus dig site is closed this week because a gnome was "found looking at us." The {module} quiz is <b>still due {due}</b>.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Confirmed, the dig is closed and the quiz is still due.', good: true },
        { text: 'THE GNOME WAS LOOKING AT YOU??', note: `Understandable, but it doesn't confirm anything.` },
        { text: 'Is the quiz closed too?', note: 'The subject and the email both say the quiz is still due.' }
      ]
    },
    modules: [
      {
        title: 'Gnome Origins',
        articles: [{
          title: 'Small Beginnings: Where Garden Gnomes Came From', author: 'Dr. Thaddeus Mossbottom',
          body: `<p>The first garden gnome was made in <b>1841</b> by a potter named <b>Gretchen Kilnworth</b>, who wanted something to "keep an eye on the cabbages."</p>
<p>Early gnomes had <b>blue hats</b>. The famous <b>red hat</b> appeared in 1880, after a shipment of blue paint was lost at sea.</p>
<p>Anthropologists divide gnomes into three groups: <b>workers</b> (holding tools), <b>thinkers</b> (holding nothing, looking thoughtful) and <b>travelers</b>, gnomes that have been photographed in other countries.</p>`
        }],
        questions: [
          { q: 'Who made the first garden gnome?', options: ['Gretchen Kilnworth', 'Dolores Mismatch', 'Agnes Featherstone', 'Ida Munch'], answer: 0 },
          { q: 'Why did gnome hats change from blue to red?', options: ['Red was more popular', 'A shipment of blue paint was lost at sea', 'A law required it', 'Birds liked red'], answer: 1 },
          { q: 'Which is NOT one of the three gnome groups?', options: ['Workers', 'Thinkers', 'Travelers', 'Guardians'], answer: 3 },
          { q: 'Where did the latest dig find the oldest known gnome?', options: ['Under a cabbage patch', 'Inside a well in Dozeborough', 'At the bottom of Lake Moist', 'In the Museum of Damp Crafts'], answer: 1, fromEmail: true }
        ],
        email: {
          type: 'update', subject: 'Exciting news from the dig',
          body: `<p>Greetings everyone,</p><p>Breaking news from the field: last week's dig found the oldest known gnome <b>inside a well in Dozeborough</b>. It's older than Kilnworth's! The reading doesn't include this yet, but the quiz does.</p><p>Please reply to confirm.</p>`,
          replies: [
            { text: 'That is exciting! A well in Dozeborough, got it.', good: true },
            { text: 'so the reading is wrong now?', note: `The reading isn't wrong; there's just new information. And it doesn't confirm anything.` },
            { text: 'cool', note: `He asked you to confirm the new detail. "Cool" doesn't show you read it.` }
          ],
          regrade: 'Thanks! I took the quiz before this news. Could that question be dropped for me?',
          lesson: 'New discoveries can update what you read. Watch for updates from professors.'
        }
      },
      {
        title: 'Gnome Society',
        articles: [{
          title: 'Hierarchy in the Flowerbed', author: 'Dr. Thaddeus Mossbottom',
          body: `<p>In any garden with three or more gnomes, the tallest is usually placed <b>near the gate</b>. Anthropologists call this gnome the <b>Gatekeeper</b>.</p>
<p>Gnomes facing the house are said to be "on watch." Gnomes facing away are "on break." A garden where every gnome faces away is considered <b>"on strike."</b></p>
<p>The study of gnome placement, called <b>gnomography</b>, was founded in <b>1952</b> by <b>Dr. Petunia Hedge</b>.</p>`
        }],
        questions: [
          { q: 'What do anthropologists call the tallest gnome near the gate?', options: ['The Chief', 'The Gatekeeper', 'The Watcher', 'The Elder'], answer: 1 },
          { q: 'What does it mean when every gnome faces away from the house?', options: ['On watch', 'On break', 'On strike', 'Asleep'], answer: 2 },
          { q: 'What is gnomography?', options: ['Painting gnomes', 'The study of gnome placement', 'Gnome photography', 'Making gnomes'], answer: 1 },
          { q: 'Who founded gnomography?', options: ['Petunia Hedge', 'Gretchen Kilnworth', 'Thaddeus Mossbottom', 'Ludwig Quillsby'], answer: 0 }
        ]
      },
      {
        title: 'The Traveling Gnome',
        articles: [{
          title: 'Postcards from Nowhere: The Traveling Gnome Phenomenon', author: 'Dr. Thaddeus Mossbottom',
          body: `<p>In <b>1986</b>, a gnome named <b>Sir Pebbleton</b> vanished from a garden in Murkwell. Over the next year, his owners received <b>23 postcards</b> showing him in front of famous landmarks.</p>
<p>He was returned with a tiny suitcase and a note that read: <b>"I needed to find myself."</b></p>
<p>Anthropologists call this a <b>"gnome-cation."</b> Sir Pebbleton is now displayed at the Murkwell Public Library, still holding his suitcase.</p>`
        }],
        questions: [
          { q: 'When did Sir Pebbleton disappear?', options: ['1952', '1986', '1991', '2003'], answer: 1 },
          { q: 'How many postcards did his owners receive?', options: ['3', '12', '23', '100'], answer: 2 },
          { q: 'What did the note say?', options: ['"Wish you were here"', '"I needed to find myself"', '"Back soon"', '"The cabbages are fine"'], answer: 1 },
          { q: 'Where is Sir Pebbleton displayed now?', options: ['Murkwell Public Library', 'The Museum of Damp Crafts', 'Dozeborough Town Hall', 'His original garden'], answer: 0 }
        ]
      }
    ]
  },
  {
    id: 'pudl', code: 'PUDL 220', title: 'Advanced Puddle Studies', color: '#3a8c8c',
    prof: { name: 'Dr. Marina Splashley', email: 'msplashley@goosestate.edu', sign: 'Keep it wet,<br>Dr. Splashley' },
    welcome: {
      subject: 'Welcome to PUDL 220 💧',
      body: `<p>Hi {player},</p><p>Welcome to Advanced Puddle Studies! Bring boots. Module 1 is on Noodle, and its quiz closes {due}.</p><p>Reply to confirm, please.</p>`,
      replies: [
        { text: 'Thank you! Boots are ready. Confirmed.', good: true },
        { text: 'what if I only have sandals', note: `It doesn't confirm anything.` },
        { text: 'is there an intro puddle class I should have taken', note: `If you're enrolled, you're ready. This doesn't confirm the email.` }
      ]
    },
    logistics: {
      subject: 'Puddle walk rained out?? (quiz still due {due})',
      body: `<p>Hi all,</p><p>Ironically, Friday's puddle walk is canceled due to rain. The {module} quiz is <b>still due {due}</b>.</p><p>Please reply to confirm.</p>`,
      replies: [
        { text: 'Got it. No walk, quiz still due. Thanks!', good: true },
        { text: 'isnt rain good for puddles', note: `Ha, but it doesn't confirm anything.` },
        { text: 'Is the quiz rained out too?', note: 'The email says it is still due.' }
      ]
    },
    modules: [
      {
        title: 'Puddle Basics',
        articles: [{
          title: 'What Makes a Puddle?', author: 'Dr. Marina Splashley',
          body: `<p>A puddle must be at least <b>one inch deep</b> to count as a puddle. Anything shallower is a <b>"dampness."</b> This rule was set in <b>1923</b> by the <b>Puddle Standards Board</b>.</p>
<p>The deepest puddle ever recorded formed on <b>Elm Street</b> in Gooseberry Falls in 1977. It was <b>three feet deep</b> and lasted eleven days, during which locals rented canoes.</p>
<p>Puddles are classified by shape: <b>round</b>, <b>oblong</b> and <b>"suspicious."</b></p>`
        }],
        questions: [
          { q: 'How deep must a puddle be?', options: ['A quarter inch', 'One inch', 'Six inches', 'One foot'], answer: 1 },
          { q: 'Where did the deepest recorded puddle form?', options: ['Feather Street', 'Elm Street', 'Lake Moist', 'Mallard Park'], answer: 1 },
          { q: 'What do you call something shallower than a puddle?', options: ['A splash', 'A dampness', 'A drip', 'A mini-puddle'], answer: 1 },
          { q: 'According to the guest speaker, what is the best tool for measuring a puddle?', options: ['A ruler', 'A yardstick', 'A rubber duck with markings', 'A boot'], answer: 2, fromEmail: true }
        ],
        email: {
          type: 'guest', subject: 'Notes from our guest puddle-measurer',
          body: `<p>Hi everyone,</p><p>Thanks for coming to hear from master puddle-measurer Rainer Gutter! His biggest tip: the best tool for measuring a puddle is <b>a rubber duck with markings</b> on its side. It floats, it's accurate and it's cheerful. This will be on the quiz.</p><p>Please reply to confirm.</p>`,
          replies: [
            { text: 'Thanks for the notes! A marked rubber duck, got it.', good: true },
            { text: 'I was sick that day', note: `The notes cover what you missed. She asked you to confirm you read them.` },
            { text: 'where do I buy one', note: `Not a confirmation.` }
          ],
          regrade: 'Thanks! I took the quiz before these notes came out. Could that question be dropped for me?',
          lesson: 'Guest lectures count. Recaps are how professors share what you missed.'
        }
      },
      {
        title: 'Puddle Behavior',
        articles: [{
          title: 'The Secret Life of Puddles', author: 'Dr. Marina Splashley',
          body: `<p>Puddles are not as still as they look. The average puddle <b>shrinks by half every two hours</b> on a sunny day, a rule known as <b>Gutter's Law</b>.</p>
<p>Puddles near bus stops are the most dangerous, because of <b>"the splash zone,"</b> which extends <b>six feet</b> from the curb.</p>
<p>Researchers have observed that children are drawn to puddles from up to <b>forty feet away</b>, a phenomenon called <b>puddle gravity</b>.</p>`
        }],
        questions: [
          { q: 'What does Gutter\'s Law say?', options: ['Puddles grow at night', 'A puddle shrinks by half every two hours on a sunny day', 'Puddles must be one inch deep', 'Puddles attract children'], answer: 1 },
          { q: 'How far does "the splash zone" extend?', options: ['Two feet', 'Six feet', 'Forty feet', 'One block'], answer: 1 },
          { q: 'What is puddle gravity?', options: ['Water flowing downhill', 'Children being drawn to puddles from far away', 'Puddles merging', 'Heavy rain'], answer: 1 },
          { q: 'Where are the most dangerous puddles?', options: ['Near bus stops', 'In parks', 'On bridges', 'In parking lots'], answer: 0 }
        ]
      },
      {
        title: 'Puddles and Society',
        articles: [{
          title: 'Splash Etiquette', author: 'Dr. Marina Splashley',
          body: `<p>Every culture has puddle rules. In Gooseberry Falls, it is polite to <b>wait three seconds</b> before jumping into a puddle someone else is admiring.</p>
<p>The <b>Splash Code of 1958</b> forbids drivers from splashing pedestrians "on purpose or with a smile." Violators must buy the victim <b>new socks</b>, which economists say has helped the sock market.</p>
<p>The town's annual <b>Puddle Parade</b>, held every <b>April</b>, ends at the Elm Street puddle site.</p>`
        }],
        questions: [
          { q: `How long should you wait before jumping into someone else's puddle?`, options: ['One second', 'Three seconds', 'One minute', 'Never jump in'], answer: 1 },
          { q: 'What does the Splash Code of 1958 forbid?', options: ['Jumping in puddles', 'Drivers splashing pedestrians on purpose', 'Puddles near bus stops', 'Wearing sandals'], answer: 1 },
          { q: 'What must violators of the Splash Code do?', options: ['Pay a fine', 'Buy the victim new socks', 'Apologize in writing', 'Clean the street'], answer: 1 },
          { q: 'When is the Puddle Parade?', options: ['Every April', 'Every November', 'Whenever it rains', 'March 3'], answer: 0 }
        ]
      }
    ]
  }
];
