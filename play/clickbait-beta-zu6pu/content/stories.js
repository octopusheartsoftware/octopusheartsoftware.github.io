// The news story catalog. Each game draws 3, each with a different "lean", so the biased sites
// in one game never all lean the same way:
//   gov-critic       the partisan site attacks the city government
//   gov-booster      the partisan site cheers for the city government
//   company-booster  the partisan site cheers for a company or industry
//   company-critic   the partisan site attacks a company
// Each story has: a TV headline, a parent's question (email and text versions), three replies
// (good = matches the reliable source, mid = the mixed source, bad = the partisan source),
// three search results, a sponsored result, an original source to trace, and follow-up headlines.

window.CONTENT_STORIES = [
  {
    id: 'pond', lean: 'gov-critic', query: 'mallard park duck pond parking garage',
    tv: { icon: '🦆', headline: 'COUNCIL EYES DUCK POND FOR PARKING GARAGE' },
    ask: {
      subject: 'is this true??',
      body: `<p>Saw on the news they're bulldozing the duck pond in Mallard Park for a PARKING GARAGE. That's where we had our first date!!</p><p>Can you look it up? You're the smart one in college now.</p>`,
      text: `The news says they're bulldozing the Mallard Park duck pond for a parking garage?? That's where we had our first date! Can you look it up?`,
      replies: [
        { text: `Nothing's decided yet. The council voted 5–2 to pay for a 6-month study, and people can comment until March 1.`, verdict: 'good' },
        { text: `It's true! Bulldozers are already there, they're evicting the ducks TOMORROW!`, verdict: 'bad' },
        { text: `Yeah, it's basically a done deal. The garage is coming.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '🗳️', headline: 'Residents pack pond hearing; council promises open public review' },
      mid: { icon: '❓', headline: 'Confusion over pond plan; council insists "nothing decided"' },
      bad: { icon: '🔥', headline: '"DUCK RIOTS" AT CITY HALL AFTER FALSE BULLDOZER RUMOR' },
      missed: { icon: '📢', headline: 'Bulldozer rumor spreads through local book clubs' }
    },
    sponsored: 'parkpal-ad', primary: 'council-minutes', results: ['gazette-pond', 'pondpatriots-pond', 'honkreport-pond'],
    lesson: 'Lateral reading: check what others say about a site before trusting it.',
    sites: {
      'gazette-pond': {
        kind: 'reputable', outlet: 'The Gooseberry Gazette', domain: 'gooseberrygazette.com', path: '/local/2026/council-pond-study',
        theme: { bg: '#fbf8f1', ink: '#1f1d1a', accent: '#1f4e79', font: 'serif' },
        title: 'Council votes to study garage idea for part of Mallard Park',
        snippet: 'The City Council voted 5–2 Tuesday to fund a six-month study. No construction has been approved…',
        byline: 'By Rosa Delgado-Finch, Staff Reporter · Updated Tuesday, 9:40 PM',
        body: `<p>The Gooseberry Falls City Council voted 5–2 on Tuesday to pay for a <b>six-month study</b> of whether a parking garage could be built on part of Mallard Park, including the duck pond.</p>
<p><b>No construction has been approved.</b> The study's findings will be presented in April, followed by public hearings before any final vote.</p>
<p>"Downtown parking is a real problem, and we owe it to residents to look at every option," said Council Member Hal Bramble, who proposed the study.</p>
<p>Council Member June Oduya voted no. "That pond is the heart of the park. I don't think we need six months to know that," she said.</p>
<p>Residents can submit comments to the city clerk until <b>March 1</b>.</p>
<p class="source">Source: <a data-go="site:council-minutes" data-href="https://gooseberryfalls.gov/council/minutes/oct-21">Read the official council meeting minutes</a></p>`,
        about: `<p>The Gooseberry Gazette has covered Gooseberry Falls since 1891. It is owned by the nonprofit Gooseberry Community Media Trust.</p><p><b>Corrections policy:</b> We fix errors quickly and note every correction at the bottom of the story.</p>`,
        wiki: 'The Gooseberry Gazette is a nonprofit local newspaper founded in 1891. It has won several regional journalism awards and publishes corrections openly. Media watchdogs rate it highly for accuracy.',
        tells: ['A named reporter and a date', 'Quotes from both sides of the vote', 'Links to the official council minutes', 'A long history and a public corrections policy']
      },
      'pondpatriots-pond': {
        kind: 'partisan', outlet: 'PondPatriots', domain: 'pondpatriots.net', path: '/breaking/THEY-ARE-COMING-FOR-OUR-DUCKS',
        theme: { bg: '#fff4f0', ink: '#2a0a0a', accent: '#c4161c', font: 'impact' },
        title: `THEY'RE COMING FOR OUR DUCKS!!! Council EVICTS Mallard Park TOMORROW`,
        snippet: 'Sources say bulldozers are ALREADY parked outside the pond. Share before they DELETE this…',
        byline: 'Posted by Admin',
        body: `<p><b>WAKE UP GOOSEBERRY!!!</b> The out-of-touch Council has DONE IT. Sources say bulldozers are ALREADY parked outside the pond and the ducks will be EVICTED TOMORROW MORNING.</p>
<p>They held a SECRET vote (that the mainstream media won't tell you about) to pave paradise and put up a parking lot. This is what happens when you let the Pebble Party run City Hall!!!</p>
<div class="native-ad"><span>Sponsored</span> 🦆 Duck Survival Kit, only $49.99! Protect YOUR ducks before it's too late.</div>
<p><b>SHARE THIS BEFORE THEY DELETE IT!!!</b></p>`,
        about: `<p>We are concerned citizens who are tired of being lied to.</p><p>We do not list our names, for our safety.</p>`,
        wiki: `PondPatriots.net is an anonymous website registered four months ago. It has published several stories that were later shown to be false, and it doesn't list owners, staff or funding.`,
        tells: ['No author ("Posted by Admin")', 'ALL CAPS and outrage', '"Sources say" with no sources', '"Share before they delete this!"', 'Anonymous, with a history of false stories']
      },
      'honkreport-pond': {
        kind: 'mixed', outlet: 'The Honk Report', domain: 'thehonkreport.blog', path: '/pond-vs-parking',
        theme: { bg: '#f4f7f2', ink: '#1d2a1c', accent: '#4c7a3a', font: 'sans' },
        title: 'Pond vs. Parking: Why the Garage Is Basically a Done Deal',
        snippet: `The council voted 5–2 for a study, but let's be real. Studies are just for show…`,
        byline: 'By Dale Quackenbush',
        body: `<p>On Tuesday the council voted 5–2 to fund a six-month study of a garage at Mallard Park, with results due in April.</p>
<p>But let's be real: studies like this are just for show. Once the city spends money on a study, the garage is basically guaranteed.</p>
<p>Agree? Disagree? Tell me on this week's episode of the <i>Honk Report</i> podcast, sponsored by ParkPal Garages.</p>`,
        about: `<p>The Honk Report is the blog and podcast of Dale Quackenbush, Gooseberry's #1 opinion guy since 2019.</p>`,
        wiki: 'The Honk Report is an opinion blog and podcast by local host Dale Quackenbush. It usually gets basic facts right but mixes them with strong opinions. Its podcast is sponsored by ParkPal Garages.',
        tells: ['The facts (5–2 vote, six-month study) match other coverage', 'The conclusion ("done deal") is opinion, not fact', 'Its podcast sponsor, ParkPal, would profit from a garage']
      },
      'parkpal-ad': {
        kind: 'ad', outlet: 'ParkPal Garages', domain: 'parkpal.com', path: '/gooseberry',
        theme: { bg: '#eef3fb', ink: '#14213d', accent: '#2563eb', font: 'sans' },
        title: 'Gooseberry Deserves Better Parking | ParkPal',
        snippet: `The pond debate is over. ParkPal builds tomorrow's garages today. Learn more.`,
        byline: 'Sponsored content',
        body: `<p><b>The pond debate is over.</b> Modern cities choose modern parking. ParkPal has built 400 garages across the region, each with a free duck-themed mural.</p>`,
        about: '<p>ParkPal Garages, Inc. designs, builds and operates parking garages.</p>',
        wiki: 'ParkPal Garages is a private company that builds and runs parking garages. It would likely bid to build any garage at Mallard Park.',
        tells: ['Labeled "Sponsored": a paid ad, not news', 'Written by a company that would profit from the garage']
      },
      'council-minutes': {
        kind: 'primary', outlet: 'City of Gooseberry Falls', domain: 'gooseberryfalls.gov', path: '/council/minutes/oct-21',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#4a5568', font: 'serif' },
        title: 'City Council Regular Meeting: Minutes, October 21',
        byline: 'Official record · Approved by the City Clerk',
        body: `<p><b>Item 4. Mallard Park parking feasibility study.</b> Motion by Council Member Bramble to fund a six-month feasibility study of a parking structure on the north end of Mallard Park, including the pond area.</p>
<p><b>Vote:</b> Passed 5–2 (No: Oduya, Wren).</p>
<p><b>Note from the City Attorney:</b> This motion authorizes a <b>study only</b>. No construction, demolition or relocation of wildlife is authorized.</p>
<p><b>Public comment</b> on the study is open through <b>March 1</b>.</p>`,
        wiki: 'The City of Gooseberry Falls publishes official meeting minutes, budgets and studies on gooseberryfalls.gov.',
        tells: ['The original record: what the council actually voted on']
      }
    }
  },
  {
    id: 'glorp', lean: 'company-booster', query: 'glorp genius soda brainpower study',
    tv: { icon: '🥤', headline: 'GLORP GENIUS: SODA THAT BOOSTS BRAINPOWER?' },
    ask: {
      subject: 'smart soda??',
      body: `<p>The TV says the new Glorp Genius soda makes you SMARTER. Should I send you a case for finals?</p><p>Can you check if that's real?</p>`,
      text: `The TV says the new Glorp Genius soda makes you SMARTER. Should I send you a case for finals?? Can you check if that's real?`,
      replies: [
        { text: `It was a tiny study (12 people) paid for by Glorp. Experts say it doesn't show that. Maybe skip it!`, verdict: 'good' },
        { text: 'YES science proves it makes you smarter, send two cases!', verdict: 'bad' },
        { text: 'A study found some brain benefits, so it might help?', verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '🔬', headline: 'Glorp drops "brainpower" ads after questions about its tiny study' },
      mid: { icon: '🤷', headline: 'Fans and experts clash over Glorp Genius claims' },
      bad: { icon: '🧃', headline: 'Glorp Genius sells out; students swap sleep for soda before exams' },
      missed: { icon: '📢', headline: '"Smart soda" claim goes viral among parents' }
    },
    sponsored: 'glorp-ad', primary: 'glorp-study', results: ['healthnews-glorp', 'sodafreedom-glorp', 'healthhackz-glorp'],
    lesson: 'Trace claims: find the original study and check who paid for it.',
    sites: {
      'healthnews-glorp': {
        kind: 'reputable', outlet: 'Gander Public Health News', domain: 'ganderhealthnews.org', path: '/2026/glorp-genius-study',
        theme: { bg: '#f5f9fb', ink: '#10232e', accent: '#00687a', font: 'serif' },
        title: 'Does Glorp Genius make you smarter? The study behind the ads',
        snippet: 'The study had 12 participants, was paid for by Glorp, and has not been peer reviewed…',
        byline: 'By Dr. Amara Lindqvist, Health Reporter · Thursday',
        body: `<p>Glorp's new ads say its <b>Glorp Genius</b> soda "boosts brainpower." The claim is based on a single study.</p>
<p>That study had <b>12 participants</b>, was <b>paid for by Glorp</b>, and has <b>not been peer reviewed</b>. It asked people whether they "felt focused" after drinking a can, which contains about as much caffeine as two cups of coffee.</p>
<p>"Feeling alert after caffeine isn't the same as being smarter," said Dr. Felix Moreau, a nutrition researcher at Goose State who was not involved in the study.</p>
<p class="source">Source: <a data-go="site:glorp-study" data-href="https://glorp.com/genius/study.pdf">Read the original Glorp-funded study (PDF)</a></p>`,
        about: '<p>Gander Public Health News is a nonprofit newsroom covering health and science. Reporters must disclose conflicts of interest. We publish corrections at the bottom of each story.</p>',
        wiki: 'Gander Public Health News is a nonprofit health newsroom founded in 2004, funded by reader donations and foundation grants. It is known for careful reporting on medical studies.',
        tells: ['A named health reporter', 'Explains how the study was done and who paid for it', 'An independent expert quote', 'Links to the original study']
      },
      'sodafreedom-glorp': {
        kind: 'partisan', outlet: 'SodaFreedom Now', domain: 'sodafreedomnow.com', path: '/soda-haters-silenced',
        theme: { bg: '#fff8e8', ink: '#2b1d00', accent: '#d97706', font: 'impact' },
        title: 'Soda Haters SILENCED: Science PROVES Glorp Genius Makes You Smarter',
        snippet: `The nanny-state crowd has nothing left to say. The science is in, and it's FIZZY…`,
        byline: 'SodaFreedom Staff',
        body: `<p>The nanny-state crowd has <b>nothing left to say</b>. A groundbreaking new study PROVES what soda lovers always knew: Glorp Genius makes you SMARTER.</p>
<p>The Puddle Party's war on soda is OVER. Stock up before the government tries to ban it!</p>
<div class="native-ad"><span>Sponsored</span> 🥤 Glorp Genius, Think Fizzier. Buy 2 get 1 free.</div>`,
        about: '<p>SodaFreedom Now is a project of the Carbonated Beverage Liberty Council.</p>',
        wiki: 'SodaFreedom Now is run by the Carbonated Beverage Liberty Council, a group funded by soda companies, including Glorp. It mainly publishes articles defending the soda industry.',
        tells: ['Funded by a soda-industry group (check Goosepedia)', '"PROVES" from one small study', 'Attacks a political side instead of explaining the study', `Doesn't link to the study`]
      },
      'healthhackz-glorp': {
        kind: 'mixed', outlet: 'HealthHackz', domain: 'healthhackz.co', path: '/i-tried-glorp-genius',
        theme: { bg: '#fdf4fa', ink: '#2e1028', accent: '#b0368f', font: 'sans' },
        title: `I Tried Glorp Genius for a Week. Here's What the Science Says`,
        snippet: 'A new study found people felt more focused. Promising! Use code HACKZ10 for 10% off…',
        byline: 'By Kenzie Bloom ✨ wellness creator',
        body: `<p>A new study found that people <b>felt more focused</b> after drinking Glorp Genius. It was small (12 people), but honestly? I felt amazing all week.</p>
<p>So does it make you smarter? The science is promising! 🧠✨</p>
<p>Use my code <b>HACKZ10</b> for 10% off your first case! <a data-go="site:glorp-shop" data-href="https://glorp.com/shop?ref=hackz10">Shop Glorp Genius</a></p>
<p class="small">This post contains affiliate links. I may earn a commission.</p>`,
        about: `<p>Hi! I'm Kenzie, and I share wellness tips that work for ME. 💕</p>`,
        wiki: 'HealthHackz is a wellness blog and video channel by influencer Kenzie Bloom. It earns money from affiliate links and brand deals.',
        tells: ['Mentions the real study size accurately', 'But jumps from "felt focused" to "promising" for intelligence', 'Earns a commission if you buy (affiliate link)']
      },
      'glorp-ad': {
        kind: 'ad', outlet: 'Glorp', domain: 'glorp.com', path: '/genius',
        theme: { bg: '#eefaf3', ink: '#0d2b1c', accent: '#16a34a', font: 'sans' },
        title: 'Glorp Genius | Think Fizzier™', snippet: 'Clinically studied*. Feel the focus. Find Glorp Genius near you.', byline: 'Sponsored content',
        body: '<p><b>Think Fizzier™.</b> Glorp Genius is clinically studied* to help you feel focused.</p><p class="small">*In one study funded by Glorp.</p>',
        about: '<p>Glorp Beverage Co. makes sodas and energy drinks.</p>',
        wiki: 'Glorp Beverage Co. is a soda company. It paid for the study behind its Glorp Genius ads.',
        tells: ['Labeled "Sponsored": a paid ad', 'The fine print says the company paid for its own study']
      },
      'glorp-study': {
        kind: 'primary', outlet: 'Glorp Research (PDF)', domain: 'glorp.com', path: '/genius/study.pdf',
        theme: { bg: '#fdfdfd', ink: '#222', accent: '#666', font: 'serif' },
        title: 'Effects of Glorp Genius on Perceived Focus: A Pilot Study',
        byline: 'R. Fizzwell, PhD · Glorp Beverage Co. Research Department',
        body: `<p><b>Participants:</b> 12 adults, all <b>employees of Glorp Beverage Co.</b></p>
<p><b>Method:</b> Each participant drank one can of Glorp Genius (160 mg caffeine) on one day and a glass of water on another, then answered: "How focused do you feel right now?" (1 to 5).</p>
<p><b>Results:</b> Average score 3.9 after Glorp Genius, 3.1 after water.</p>
<p><b>Limitations:</b> Small sample. Participants knew which drink they had. No tests of memory, learning or intelligence. Not peer reviewed.</p>
<p><b>Funding:</b> Glorp Beverage Co.</p>`,
        wiki: 'Glorp Beverage Co. is a soda company. It paid for the study behind its Glorp Genius ads.',
        tells: ['The original study: only 12 people, all Glorp employees', 'It measured how focused people felt, not intelligence', 'Paid for entirely by Glorp']
      },
      'glorp-shop': {
        kind: 'shop', outlet: 'Glorp Shop', domain: 'glorp.com', path: '/shop?ref=hackz10',
        theme: { bg: '#eefaf3', ink: '#0d2b1c', accent: '#16a34a', font: 'sans' },
        title: 'Glorp Genius 6-Pack', byline: '', price: 9, affiliate: 'Kenzie from HealthHackz',
        body: `<p class="meme" style="font-size:70px;padding:10px">🥤🥤🥤</p><p><b>Glorp Genius 6-pack: $9.00</b> <span class="small">(code HACKZ10 applied: 10% off!)</span></p><p class="small muted">Referred by: HealthHackz (ref=hackz10)</p>`,
        tells: ['"ref=hackz10" in the address means Kenzie earns money from your purchase']
      }
    }
  },
  {
    id: 'bikes', lean: 'gov-booster', query: 'mayor pinfeather bike lanes traffic',
    tv: { icon: '🚲', headline: 'MAYOR: NEW BIKE LANES WILL "END TRAFFIC FOREVER"' },
    ask: {
      subject: 'no more traffic?!',
      body: `<p>The news says the mayor's new bike lanes are going to END TRAFFIC FOREVER. That sounds too good to be true. Who's right? Loser does the dishes.</p>`,
      text: `The mayor says the new bike lanes will END TRAFFIC FOREVER. Too good to be true? Loser of our bet does the dishes 😅`,
      replies: [
        { text: `It's a one-year test on two streets. The city expects maybe 6–8% fewer car trips there and will review it next fall.`, verdict: 'good' },
        { text: `It's true! The mayor's bike lanes will end traffic forever!`, verdict: 'bad' },
        { text: 'Bike lanes are coming, and traffic will pretty much disappear.', verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '🚦', headline: 'Bike lane test begins; city asks shops and riders for feedback' },
      mid: { icon: '🤔', headline: 'Mixed expectations as bike lane test begins' },
      bad: { icon: '😤', headline: 'Traffic still exists; angry residents feel "lied to" by city hall' },
      missed: { icon: '📢', headline: '"Traffic will end forever" claim spreads in neighborhood group chat' }
    },
    sponsored: 'spokes-ad', primary: 'city-traffic-study', results: ['gazette-bikes', 'pebbleprogress-bikes', 'dailycommute-bikes'],
    lesson: 'Find better coverage: when a claim sounds huge, see what careful outlets actually report.',
    sites: {
      'spokes-ad': {
        kind: 'ad', outlet: 'Spokes & Honks Bike Shop', domain: 'spokesandhonks.com', path: '/bike-lane-sale',
        theme: { bg: '#f3f8ee', ink: '#1c2a12', accent: '#4d7c0f', font: 'sans' },
        title: 'The Bike Lanes Are Coming! 20% Off Everything | Spokes & Honks',
        snippet: 'Traffic is OVER. Get your bike now, before everyone else does.', byline: 'Sponsored content',
        body: '<p><b>Traffic is OVER.</b> Get your bike now, before everyone else does! 20% off all bikes this week.</p>',
        about: '<p>Spokes & Honks is a family-owned bike shop on Feather Street.</p>',
        wiki: 'Spokes & Honks is a bike shop on Feather Street, one of the streets getting a test bike lane. It would benefit from more cyclists.',
        tells: ['Labeled "Sponsored": a paid ad', 'A shop on Feather Street would benefit from the bike lanes']
      },
      'gazette-bikes': {
        kind: 'reputable', outlet: 'The Gooseberry Gazette', domain: 'gooseberrygazette.com', path: '/local/2026/bike-lane-pilot',
        theme: { bg: '#fbf8f1', ink: '#1f1d1a', accent: '#1f4e79', font: 'serif' },
        title: 'City to test bike lanes on two downtown streets for one year',
        snippet: `A one-year pilot on Elm and Feather Streets. The city's own study projects 6–8% fewer car trips…`,
        byline: 'By Marcus Webb-Tanaka, Transportation Reporter · Monday',
        body: `<p>Gooseberry Falls will add protected bike lanes to <b>Elm Street and Feather Street</b> as part of a <b>one-year pilot program</b>, Mayor Delphine Pinfeather announced Monday.</p>
<p>At the announcement, the mayor said the lanes would "end traffic forever." The city's own traffic study is more modest: it projects <b>6–8% fewer car trips</b> on the two streets.</p>
<p>Some shop owners on Elm Street worry about losing 40 parking spaces. "I'm not against bikes. I'm against my customers circling the block," said bakery owner Tess Adeyemi.</p>
<p>The council will review the results <b>next fall</b>.</p>
<p class="source">Source: <a data-go="site:city-traffic-study" data-href="https://gooseberryfalls.gov/transportation/elm-feather-pilot">Read the city's traffic study</a></p>`,
        about: `<p>The Gooseberry Gazette has covered Gooseberry Falls since 1891. It is owned by the nonprofit Gooseberry Community Media Trust.</p>`,
        wiki: 'The Gooseberry Gazette is a nonprofit local newspaper founded in 1891. It has won several regional journalism awards and publishes corrections openly. Media watchdogs rate it highly for accuracy.',
        tells: ['A named transportation reporter', `Compares the mayor's claim with the city's own numbers`, 'Quotes people with concerns', 'Links to the traffic study']
      },
      'pebbleprogress-bikes': {
        kind: 'partisan', outlet: 'Pebble Progress Now', domain: 'pebbleprogress.org', path: '/mayor-ends-traffic',
        theme: { bg: '#f1f4ff', ink: '#0f1640', accent: '#4338ca', font: 'impact' },
        title: `Mayor Pinfeather's Bike Lanes Will END TRAFFIC FOREVER (And Critics Are FURIOUS)`,
        snippet: 'Only Puddle Party dinosaurs could oppose this VISIONARY plan. Traffic is DONE…',
        byline: 'The Pebble Progress Team',
        body: `<p>Once again, <b>Mayor Pinfeather delivers</b>. Her VISIONARY bike lanes will END TRAFFIC FOREVER, and only Puddle Party dinosaurs could possibly be against it.</p>
<p>Critics are FURIOUS because they know the Mayor is right. Traffic is DONE.</p>
<div class="native-ad"><span>Sponsored</span> 🗳️ Re-elect Mayor Pinfeather. Paid for by Friends of Pinfeather.</div>`,
        about: `<p>Pebble Progress Now celebrates the achievements of Gooseberry's leaders.</p>`,
        wiki: `Pebble Progress Now is a website paid for by the Pebble Party's campaign committee, the party of Mayor Pinfeather. It publishes praise of party officials and attacks on their opponents.`,
        tells: [`Paid for by the mayor's own party (check Goosepedia)`, `Repeats the mayor's claim with no numbers`, 'Insults critics instead of answering them', 'A campaign ad in the middle of the "news"']
      },
      'dailycommute-bikes': {
        kind: 'mixed', outlet: 'The Daily Commute', domain: 'thedailycommute.news', path: '/p/bike-lanes-are-here',
        theme: { bg: '#f7f5ff', ink: '#221c38', accent: '#7c3aed', font: 'sans' },
        title: 'Bike Lanes Are Coming, and Traffic Is About to Disappear',
        snippet: 'The city is testing lanes on Elm and Feather for a year. Honestly? Traffic is basically solved…',
        byline: 'By Jo Spinwell, cyclist and newsletter writer',
        body: `<p>Big news: the city is testing protected bike lanes on Elm and Feather Streets for one year, with a review next fall.</p>
<p>Honestly? Once people try it, traffic is basically going to disappear. I've biked to work for ten years and I've never been stuck in traffic once.</p>`,
        about: '<p>The Daily Commute is a free newsletter by Jo Spinwell about biking, buses and why cars are overrated.</p>',
        wiki: 'The Daily Commute is a personal newsletter by cycling advocate Jo Spinwell. It reports local transportation news accurately but with strong pro-bike opinions.',
        tells: ['The facts (two streets, one year, review next fall) match the Gazette', 'The conclusion ("traffic will disappear") is personal opinion', `One person's experience isn't evidence for a whole city`]
      },
      'city-traffic-study': {
        kind: 'primary', outlet: 'City of Gooseberry Falls', domain: 'gooseberryfalls.gov', path: '/transportation/elm-feather-pilot',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#4a5568', font: 'serif' },
        title: 'Elm & Feather Street Bike Lane Pilot: Traffic Study Summary',
        byline: 'Department of Transportation · City of Gooseberry Falls',
        body: `<p><b>Scope:</b> A one-year pilot of protected bike lanes on Elm Street and Feather Street.</p>
<p><b>Projected effect:</b> 6–8% fewer car trips on the two pilot streets. Little change expected elsewhere.</p>
<p><b>Trade-offs:</b> About 40 on-street parking spaces removed from Elm Street.</p>
<p><b>Review:</b> Results presented to the City Council next fall.</p>`,
        wiki: 'The City of Gooseberry Falls publishes official meeting minutes, budgets and studies on gooseberryfalls.gov.',
        tells: ['The original study: 6–8% fewer trips on two streets, not "the end of traffic"']
      }
    }
  },
  {
    id: 'waffles', lean: 'company-critic', query: 'megamart frozen waffle recall',
    tv: { icon: '🧇', headline: 'MEGAMART RECALLS FROZEN WAFFLES' },
    ask: {
      subject: 'waffles!!',
      body: `<p>The news says MegaMart is recalling waffles. We have THREE boxes of MegaMart waffles in the freezer. Is our whole freezer poisoned?? What's going on?</p>`,
      text: `MegaMart is recalling waffles?! We have 3 boxes. Is the freezer poisoned?? What's actually going on?`,
      replies: [
        { text: 'Only one batch (lot 4417) is recalled after a few reports of plastic bits. No injuries. Check the lot number on the box.', verdict: 'good' },
        { text: `MegaMart KNEW and hid it for years! Throw out everything from MegaMart!`, verdict: 'bad' },
        { text: `Honestly MegaMart food seems sketchy. I'd stop buying from them.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '✅', headline: 'Waffle recall going smoothly; shoppers check lot numbers' },
      mid: { icon: '🛒', headline: 'Some shoppers swear off MegaMart after waffle recall' },
      bad: { icon: '🗑️', headline: 'Panic: residents dump full freezers over "poison waffle" rumor' },
      missed: { icon: '📢', headline: '"Poison waffle" rumor spreads at school pickup' }
    },
    sponsored: 'megamart-ad', primary: 'waffle-recall', results: ['consumer-waffles', 'boycott-waffles', 'snackdad-waffles'],
    lesson: 'Trace claims: an official recall notice tells you exactly what is affected.',
    sites: {
      'megamart-ad': {
        kind: 'ad', outlet: 'MegaMart', domain: 'megamart.com', path: '/deals',
        theme: { bg: '#fff7ed', ink: '#2a1606', accent: '#ea580c', font: 'sans' },
        title: 'MegaMart Weekly Deals | Fresh Savings Every Day', snippet: 'Quality you can trust. This week: 2-for-1 frozen breakfast.', byline: 'Sponsored content',
        body: '<p><b>Quality you can trust.</b> This week only: 2-for-1 frozen breakfast favorites!</p>',
        about: '<p>MegaMart is a chain of grocery and general stores.</p>',
        wiki: 'MegaMart is a large grocery and general store chain. It is the company doing the waffle recall.',
        tells: ['Labeled "Sponsored": a paid ad', 'Placed by the company in the news story, right on top of the results']
      },
      'consumer-waffles': {
        kind: 'reputable', outlet: 'Gander Consumer Report', domain: 'ganderconsumer.org', path: '/recalls/megamart-waffles',
        theme: { bg: '#f8fafc', ink: '#0f172a', accent: '#0f766e', font: 'serif' },
        title: 'MegaMart recalls one batch of frozen waffles over plastic pieces',
        snippet: 'The recall covers lot 4417 only, after three customer reports. No injuries have been reported…',
        byline: 'By Hannah Osei, Consumer Safety Reporter · Wednesday',
        body: `<p>MegaMart is voluntarily recalling <b>one batch</b> of its store-brand frozen waffles, <b>lot 4417</b>, after three customers reported finding small pieces of plastic.</p>
<p><b>No injuries have been reported.</b> The plastic came from a broken part on one production line, which has been replaced, according to the Consumer Safety Board.</p>
<p>Shoppers can check the lot number printed on the side of the box. Recalled boxes can be returned for a full refund.</p>
<p class="source">Source: <a data-go="site:waffle-recall" data-href="https://consumersafety.gov/recalls/2026-118">Read the official recall notice</a></p>`,
        about: '<p>Gander Consumer Report is an independent nonprofit that tests products and covers recalls. It accepts no advertising.</p>',
        wiki: 'Gander Consumer Report is an independent nonprofit consumer organization founded in 1962. It accepts no advertising and is known for careful product testing.',
        tells: ['A named consumer-safety reporter', 'Specific facts: one lot number, three reports, no injuries', 'Cites the government safety board', 'Links to the official recall notice']
      },
      'boycott-waffles': {
        kind: 'partisan', outlet: 'Boycott Watch', domain: 'boycottwatch.net', path: '/megamart-poison',
        theme: { bg: '#fff1f2', ink: '#2a0a10', accent: '#be123c', font: 'impact' },
        title: 'MEGAMART KNEW: Poison Waffles HIDDEN For YEARS',
        snippet: 'Insiders say MegaMart covered this up for YEARS. Throw out EVERYTHING you bought there…',
        byline: 'Boycott Watch Investigations',
        body: `<p>Insiders say MegaMart has known about <b>dangerous waffles for YEARS</b> and covered it up to protect its profits.</p>
<p>Don't trust ANY of their food. <b>Throw out everything</b> you've ever bought at MegaMart and shop at an independent grocer instead.</p>
<div class="native-ad"><span>Sponsored</span> 🥬 Shop local! Corner Basket Grocery, 10% off for Boycott Watch readers.</div>`,
        about: '<p>Boycott Watch exposes corporate wrongdoing. Supported by independent businesses.</p>',
        wiki: 'Boycott Watch is a website funded by a group of independent grocery stores that compete with MegaMart. Its articles about chain stores have often exaggerated or invented claims.',
        tells: ['Funded by MegaMart\'s competitors (check Goosepedia)', '"Insiders say" with no names', '"Throw out everything" goes far beyond one batch', 'An ad for a competing store']
      },
      'snackdad-waffles': {
        kind: 'mixed', outlet: 'Snack Dad Reviews', domain: 'snackdadreviews.com', path: '/megamart-waffle-recall',
        theme: { bg: '#fefce8', ink: '#27230b', accent: '#a16207', font: 'sans' },
        title: `The MegaMart Waffle Recall: Why I'm Done With Store Brands`,
        snippet: 'Yes, it is just one batch, lot 4417. But this is the last straw for me…',
        byline: 'By Greg "Snack Dad" Lindgren',
        body: `<p>Okay, the facts: MegaMart recalled one batch of frozen waffles, lot 4417, after reports of plastic bits. No one was hurt.</p>
<p>But honestly? This is the last straw. I'm done with store brands forever. You never know what's in them.</p>`,
        about: '<p>Snack Dad Reviews: one dad, a lot of snacks, and strong opinions.</p>',
        wiki: 'Snack Dad Reviews is a food blog by Greg Lindgren. It reports product news accurately but adds strong personal opinions.',
        tells: ['The facts (one batch, no injuries) match other coverage', 'The conclusion ("done with store brands forever") is personal opinion']
      },
      'waffle-recall': {
        kind: 'primary', outlet: 'Consumer Safety Board', domain: 'consumersafety.gov', path: '/recalls/2026-118',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#334155', font: 'serif' },
        title: 'Recall Notice 2026-118: MegaMart Frozen Waffles',
        byline: 'Consumer Safety Board · Official notice',
        body: `<p><b>Product:</b> MegaMart store-brand frozen waffles, 10-count box.</p>
<p><b>Affected lot:</b> 4417 only (printed on the side of the box).</p>
<p><b>Problem:</b> Small plastic pieces from a broken production-line part. Three reports received. No injuries.</p>
<p><b>What to do:</b> Return affected boxes to any MegaMart for a full refund. Other lots are not affected.</p>`,
        wiki: 'The Consumer Safety Board is the government agency that announces product recalls.',
        tells: ['The original notice: one lot, three reports, no injuries, other lots not affected']
      }
    }
  },
  {
    id: 'water', lean: 'gov-critic', query: 'gooseberry falls tap water taste change',
    tv: { icon: '🚰', headline: 'RESIDENTS SAY TAP WATER "TASTES DIFFERENT"' },
    ask: {
      subject: 'the water',
      body: `<p>The water at home tastes funny lately, and now the TV says people all over town noticed. Someone in the neighborhood group said the city is putting chemicals in it. Is it safe to drink?</p>`,
      text: `The tap water tastes funny lately and the TV says everyone noticed. Neighbor says the city is putting chemicals in it?? Is it safe?`,
      replies: [
        { text: `The water utility switched disinfectants, which changes the taste a bit. Tests say it's safe, and a filter pitcher helps the taste.`, verdict: 'good' },
        { text: `The city is secretly poisoning us! Don't drink a drop!`, verdict: 'bad' },
        { text: `They changed something, so I'd just buy bottled water to be safe.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '💧', headline: 'Water utility hosts taste-test night; residents learn about the switch' },
      mid: { icon: '🧴', headline: 'Bottled water sells out as residents play it safe' },
      bad: { icon: '😱', headline: '"Poison water" rumor sends crowds to city hall; utility swamped' },
      missed: { icon: '📢', headline: '"Chemicals in the water" post shared 4,000 times' }
    },
    sponsored: 'aquapure-ad', primary: 'water-notice', results: ['gazette-water', 'patriotalert-water', 'taptalk-water'],
    lesson: 'Investigate the source: who runs a site, and what do they want you to feel?',
    sites: {
      'aquapure-ad': {
        kind: 'ad', outlet: 'AquaPure Home Filters', domain: 'aquapurefilters.com', path: '/is-your-water-safe',
        theme: { bg: '#ecfeff', ink: '#083344', accent: '#0891b2', font: 'sans' },
        title: 'Is YOUR Water Safe? Protect Your Family Today | AquaPure', snippet: `Don't wait. Our whole-house filters start at $899.`, byline: 'Sponsored content',
        body: `<p><b>Is YOUR water safe?</b> Don't wait to find out. Whole-house filters start at just $899.</p>`,
        about: '<p>AquaPure sells home water filters.</p>',
        wiki: 'AquaPure is a company that sells home water filters. Its ads often appear next to news about water quality.',
        tells: ['Labeled "Sponsored": a paid ad', 'Uses fear ("Is YOUR water safe?") to sell an expensive product']
      },
      'gazette-water': {
        kind: 'reputable', outlet: 'The Gooseberry Gazette', domain: 'gooseberrygazette.com', path: '/local/2026/water-taste',
        theme: { bg: '#fbf8f1', ink: '#1f1d1a', accent: '#1f4e79', font: 'serif' },
        title: 'Why your tap water tastes different this month',
        snippet: 'The water utility switched from chlorine to chloramine on Oct. 1. Tests show the water meets every safety standard…',
        byline: 'By Priya Raman, Environment Reporter · Friday',
        body: `<p>If your tap water tastes different, you're not imagining it. On <b>October 1</b>, the Gooseberry Falls Water Utility switched its disinfectant from <b>chlorine to chloramine</b>, which many cities use because it lasts longer in the pipes.</p>
<p>Some people notice a slightly different taste. Weekly tests show the water <b>meets every state and federal safety standard</b>, according to the utility's public notice.</p>
<p>"A simple filter pitcher removes most of the taste," said utility chemist Dr. Omar Haddad.</p>
<p class="source">Source: <a data-go="site:water-notice" data-href="https://gooseberryfalls.gov/water/notice-chloramine">Read the utility's public notice</a></p>`,
        about: `<p>The Gooseberry Gazette has covered Gooseberry Falls since 1891. It is owned by the nonprofit Gooseberry Community Media Trust.</p>`,
        wiki: 'The Gooseberry Gazette is a nonprofit local newspaper founded in 1891. It has won several regional journalism awards and publishes corrections openly. Media watchdogs rate it highly for accuracy.',
        tells: ['A named environment reporter', 'Explains what changed and why', 'Quotes the utility\'s chemist', 'Links to the public notice']
      },
      'patriotalert-water': {
        kind: 'partisan', outlet: 'Gooseberry Patriot Alert', domain: 'gbpatriotalert.com', path: '/they-poisoned-the-water',
        theme: { bg: '#fff7ed', ink: '#2b0f02', accent: '#b91c1c', font: 'impact' },
        title: 'THEY ARE PUTTING CHEMICALS IN YOUR WATER. Here\'s What City Hall Won\'t Tell You',
        snippet: 'The Pebble Party bureaucrats SECRETLY changed your water. Wake up…',
        byline: 'Patriot Alert Desk',
        body: `<p>The Pebble Party bureaucrats at City Hall have <b>SECRETLY</b> put chemicals in your water. That "funny taste"? That's what they don't want you to know about.</p>
<p>Don't drink it. Don't let your kids drink it. <b>Share this with every parent you know.</b></p>
<div class="native-ad"><span>Sponsored</span> 💧 AquaPure: protect your family. Filters from $899.</div>`,
        about: '<p>Patriot Alert tells the truth the media won\'t.</p>',
        wiki: 'Gooseberry Patriot Alert is an anonymous website that posts alarming claims about the city government, many of which have been shown to be false. It earns money from ads, including water-filter ads.',
        tells: ['Anonymous, with a record of false claims', '"SECRETLY": but the utility posted a public notice', 'Fear and "share this with every parent"', 'Runs ads for the filters it scares you into buying']
      },
      'taptalk-water': {
        kind: 'mixed', outlet: 'Tap Talk Neighbors Blog', domain: 'taptalkgbf.blog', path: '/water-change',
        theme: { bg: '#f0f9ff', ink: '#0c2a3a', accent: '#0369a1', font: 'sans' },
        title: 'The City Changed Our Water. I\'m Switching to Bottled.',
        snippet: 'The utility switched to chloramine on Oct. 1. They say it\'s safe, but I\'m not taking chances…',
        byline: 'By Marjorie Bell, neighborhood blogger',
        body: `<p>The facts: the utility switched from chlorine to chloramine on October 1. They say the water is safe and meets all standards.</p>
<p>But I don't like the taste, and I don't like surprises. I'm buying bottled from now on. Better safe than sorry!</p>`,
        about: '<p>Tap Talk is a neighborhood blog about life in Gooseberry Falls.</p>',
        wiki: 'Tap Talk Neighbors Blog is a personal neighborhood blog. It usually reports local news accurately but mixes in strong personal opinions.',
        tells: ['The facts (the switch, the date, the safety tests) match other coverage', '"Better safe than sorry" is a feeling, not evidence']
      },
      'water-notice': {
        kind: 'primary', outlet: 'Gooseberry Falls Water Utility', domain: 'gooseberryfalls.gov', path: '/water/notice-chloramine',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#0e7490', font: 'serif' },
        title: 'Public Notice: Disinfectant Change to Chloramine',
        byline: 'Gooseberry Falls Water Utility · Posted September 1',
        body: `<p>Beginning <b>October 1</b>, the utility will switch its disinfectant from chlorine to <b>chloramine</b>, which lasts longer in the pipes.</p>
<p>Some residents may notice a change in taste or smell. The water will continue to meet <b>all state and federal drinking water standards</b>. Weekly test results are posted on this page.</p>
<p><b>Note:</b> Aquarium owners should treat water before adding it to fish tanks.</p>`,
        wiki: 'The City of Gooseberry Falls publishes official notices, minutes and test results on gooseberryfalls.gov.',
        tells: ['The original notice, posted a month before the switch. It was never a secret.']
      }
    }
  },
  {
    id: 'happiest', lean: 'gov-booster', query: 'gooseberry falls happiest town ranking',
    tv: { icon: '🏆', headline: 'GOOSEBERRY FALLS NAMED "HAPPIEST TOWN IN AMERICA"' },
    ask: {
      subject: 'we are #1!!',
      body: `<p>The TV says our town is officially the HAPPIEST TOWN IN AMERICA. The mayor was on the news taking credit. Is that a real thing? Who decides that?</p>`,
      text: `TV says Gooseberry Falls is officially the HAPPIEST TOWN IN AMERICA 🎉 Is that real? Who even decides that?`,
      replies: [
        { text: `It's a marketing survey by a vacation-rental company, based on 200 online answers. Fun, but not a scientific ranking.`, verdict: 'good' },
        { text: `Yes! The mayor made us the happiest town in America. It's official!`, verdict: 'bad' },
        { text: `It's a real ranking. Gooseberry is basically the best place to live.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '😄', headline: '"Happiest town" title gets a laugh; residents enjoy it for what it is' },
      mid: { icon: '🏡', headline: 'House prices jump after "happiest town" buzz' },
      bad: { icon: '🙄', headline: 'Mayor\'s "happiest town" ad campaign backfires after survey details emerge' },
      missed: { icon: '📢', headline: '"Officially happiest town" banners appear on lampposts' }
    },
    sponsored: 'staycozy-ad', primary: 'staycozy-release', results: ['gazette-happiest', 'pebbleprogress-happiest', 'gbliving-happiest'],
    lesson: 'Investigate the source: always ask who made a ranking, and why.',
    sites: {
      'staycozy-ad': {
        kind: 'ad', outlet: 'StayCozy Rentals', domain: 'staycozy.com', path: '/gooseberry-falls',
        theme: { bg: '#fdf2f8', ink: '#2a0a1f', accent: '#db2777', font: 'sans' },
        title: `Book a Stay in America's Happiest Town | StayCozy`, snippet: 'Gooseberry Falls rentals from $89/night. Happiness guaranteed!*', byline: 'Sponsored content',
        body: `<p><b>Come see why Gooseberry Falls is America's Happiest Town!</b> Rentals from $89/night.</p><p class="small">*Happiness not guaranteed.</p>`,
        about: '<p>StayCozy is a vacation rental website.</p>',
        wiki: 'StayCozy is a vacation rental company. It publishes yearly "happiest town" lists as part of its marketing.',
        tells: ['Labeled "Sponsored": a paid ad', 'The company that made the ranking is selling stays in the town it ranked']
      },
      'gazette-happiest': {
        kind: 'reputable', outlet: 'The Gooseberry Gazette', domain: 'gooseberrygazette.com', path: '/local/2026/happiest-town',
        theme: { bg: '#fbf8f1', ink: '#1f1d1a', accent: '#1f4e79', font: 'serif' },
        title: 'Gooseberry Falls tops a "happiest town" list. Here\'s how it was made.',
        snippet: 'The ranking comes from StayCozy, a vacation-rental company, based on an online survey of about 200 people…',
        byline: 'By Lena Moss, Staff Reporter · Tuesday',
        body: `<p>Gooseberry Falls was named "America's Happiest Town" this week. The title comes from <b>StayCozy</b>, a vacation-rental company, which publishes the list each year as part of its marketing.</p>
<p>The ranking is based on an <b>online survey of about 200 people</b> who answered questions like "Which town looks cozy?" Most of them have never lived here.</p>
<p>Mayor Pinfeather called it "proof our policies are working." A Goose State statistics professor called it "a nice compliment, but not a measurement of anything."</p>
<p class="source">Source: <a data-go="site:staycozy-release" data-href="https://staycozy.com/press/happiest-towns">Read StayCozy's press release</a></p>`,
        about: `<p>The Gooseberry Gazette has covered Gooseberry Falls since 1891. It is owned by the nonprofit Gooseberry Community Media Trust.</p>`,
        wiki: 'The Gooseberry Gazette is a nonprofit local newspaper founded in 1891. It has won several regional journalism awards and publishes corrections openly. Media watchdogs rate it highly for accuracy.',
        tells: ['Explains who made the ranking and how', 'Quotes both the mayor and an independent expert', 'Links to the original press release']
      },
      'pebbleprogress-happiest': {
        kind: 'partisan', outlet: 'Pebble Progress Now', domain: 'pebbleprogress.org', path: '/mayor-makes-us-number-one',
        theme: { bg: '#f1f4ff', ink: '#0f1640', accent: '#4338ca', font: 'impact' },
        title: 'IT\'S OFFICIAL: Mayor Pinfeather Makes Gooseberry the HAPPIEST TOWN IN AMERICA',
        snippet: 'Thanks to the Mayor\'s leadership, we are NUMBER ONE. Puddle Party critics are SILENT…',
        byline: 'The Pebble Progress Team',
        body: `<p>It's OFFICIAL. Thanks to <b>Mayor Pinfeather's leadership</b>, Gooseberry Falls is the HAPPIEST TOWN IN AMERICA.</p>
<p>Puddle Party critics have gone SILENT. The results speak for themselves!</p>
<div class="native-ad"><span>Sponsored</span> 🗳️ Re-elect Mayor Pinfeather. Paid for by Friends of Pinfeather.</div>`,
        about: `<p>Pebble Progress Now celebrates the achievements of Gooseberry's leaders.</p>`,
        wiki: `Pebble Progress Now is a website paid for by the Pebble Party's campaign committee, the party of Mayor Pinfeather. It publishes praise of party officials and attacks on their opponents.`,
        tells: ['Paid for by the mayor\'s party (check Goosepedia)', '"Official" without saying who made the list', 'Gives the mayor credit for a marketing survey']
      },
      'gbliving-happiest': {
        kind: 'mixed', outlet: 'Gooseberry Living Magazine', domain: 'gooseberryliving.com', path: '/happiest-town',
        theme: { bg: '#fffbeb', ink: '#2b1d05', accent: '#b45309', font: 'serif' },
        title: 'We\'re #1! Why Gooseberry Is the Best Place to Live',
        snippet: 'StayCozy\'s new list puts us on top, and honestly, we already knew…',
        byline: 'By the Gooseberry Living editors',
        body: `<p>StayCozy's yearly list puts Gooseberry Falls at #1 for happiness, based on its online survey.</p>
<p>Honestly, we already knew. With the parks, the pond and the bakeries, Gooseberry is simply the best place to live. Period.</p>`,
        about: '<p>Gooseberry Living is a lifestyle magazine about local homes, food and events.</p>',
        wiki: 'Gooseberry Living Magazine is a local lifestyle magazine funded by real-estate and restaurant ads. It covers local news in a very positive way.',
        tells: ['Says where the list came from (StayCozy\'s survey)', 'But treats a marketing survey as proof that Gooseberry is "the best place to live"', 'Funded by real-estate ads, which benefit from the buzz']
      },
      'staycozy-release': {
        kind: 'primary', outlet: 'StayCozy Press Room', domain: 'staycozy.com', path: '/press/happiest-towns',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#9d174d', font: 'sans' },
        title: 'Press Release: StayCozy\'s 2026 Happiest Towns List',
        byline: 'StayCozy Marketing Team',
        body: `<p>StayCozy is thrilled to announce this year's Happiest Towns!</p>
<p><b>How we ranked them:</b> We asked <b>212 people</b> in an online poll to look at photos of 50 towns and choose which looked "the coziest and happiest."</p>
<p><b>#1: Gooseberry Falls.</b> Book your happy getaway today at staycozy.com!</p>`,
        wiki: 'StayCozy is a vacation rental company. It publishes yearly "happiest town" lists as part of its marketing.',
        tells: ['The original source: 212 people judging photos, published to sell vacation rentals']
      }
    }
  },
  {
    id: 'tutor', lean: 'company-booster', query: 'smartypants ai tutor app grades',
    tv: { icon: '🤖', headline: 'NEW AI TUTOR APP "RAISES GRADES TWO LETTER LEVELS"' },
    ask: {
      subject: 'should we get you this app',
      body: `<p>The news had a story about an AI tutor app called SmartyPants that raises grades by TWO LETTERS. It's $30 a month. Should we sign you up? Is it legit?</p>`,
      text: `News says the SmartyPants AI tutor app raises grades TWO LETTERS. $30/month. Want it? Is it legit?`,
      replies: [
        { text: `The "two letters" claim comes from the company's own small test at one school, with nothing to compare to. Let's not pay for it yet.`, verdict: 'good' },
        { text: `Yes! It's proven to raise grades two letters. Sign me up!`, verdict: 'bad' },
        { text: `Some students say it helped a lot, so it's probably worth trying.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '📊', headline: 'Schools ask SmartyPants for independent testing before buying' },
      mid: { icon: '📱', headline: 'SmartyPants downloads soar; results so far unclear' },
      bad: { icon: '💸', headline: 'Families pay millions for SmartyPants; grades unchanged' },
      missed: { icon: '📢', headline: '"Two letter grades" ad shared across parent groups' }
    },
    sponsored: 'smartypants-ad', primary: 'smartypants-report', results: ['gazette-tutor', 'futurenow-tutor', 'brody-tutor'],
    lesson: 'Find better coverage: a company\'s own test is a starting point, not proof.',
    sites: {
      'smartypants-ad': {
        kind: 'ad', outlet: 'SmartyPants AI', domain: 'smartypants.ai', path: '/start',
        theme: { bg: '#f5f3ff', ink: '#1e1038', accent: '#7c3aed', font: 'sans' },
        title: 'Raise Your Grades Two Letter Levels | SmartyPants AI', snippet: 'Start your free trial. Then just $30/month.', byline: 'Sponsored content',
        body: '<p><b>Raise your grades two letter levels!*</b> Free 7-day trial, then $30/month.</p><p class="small">*Based on internal pilot data.</p>',
        about: '<p>SmartyPants makes AI tutoring apps.</p>',
        wiki: 'SmartyPants AI is a startup that sells a $30-a-month AI tutoring app.',
        tells: ['Labeled "Sponsored": a paid ad', 'The fine print says "internal pilot data": their own test']
      },
      'gazette-tutor': {
        kind: 'reputable', outlet: 'The Gooseberry Gazette', domain: 'gooseberrygazette.com', path: '/education/2026/smartypants',
        theme: { bg: '#fbf8f1', ink: '#1f1d1a', accent: '#1f4e79', font: 'serif' },
        title: 'AI tutor app claims big grade gains. Experts want more evidence.',
        snippet: 'The claim comes from the company\'s own pilot at one school, with no comparison group…',
        byline: 'By Daniel Kowalczyk, Education Reporter · Thursday',
        body: `<p>SmartyPants, a $30-a-month AI tutoring app, says it raises grades "two letter levels." The claim comes from the company's own <b>pilot at one middle school</b>, with <b>40 students</b> who volunteered.</p>
<p>There was <b>no comparison group</b>, so it's impossible to tell whether the students improved because of the app or for other reasons, like extra attention or simply volunteering.</p>
<p>"It may help some students," said Goose State education professor Dr. Rosa Lim. "But a company testing its own product isn't enough to know."</p>
<p class="source">Source: <a data-go="site:smartypants-report" data-href="https://smartypants.ai/pilot-report.pdf">Read the company's pilot report</a></p>`,
        about: `<p>The Gooseberry Gazette has covered Gooseberry Falls since 1891.</p>`,
        wiki: 'The Gooseberry Gazette is a nonprofit local newspaper founded in 1891. It has won several regional journalism awards and publishes corrections openly. Media watchdogs rate it highly for accuracy.',
        tells: ['A named education reporter', 'Explains who did the test and how', 'An independent expert', 'Links to the pilot report']
      },
      'futurenow-tutor': {
        kind: 'partisan', outlet: 'FutureNow Daily', domain: 'futurenowdaily.com', path: '/smartypants-revolution',
        theme: { bg: '#eef2ff', ink: '#111433', accent: '#2563eb', font: 'impact' },
        title: 'SmartyPants Will REPLACE Teachers. Parents Who Wait Will Regret It.',
        snippet: 'The AI revolution is HERE. Two letter grades, PROVEN. Don\'t let your kid fall behind…',
        byline: 'FutureNow Staff',
        body: `<p>The AI revolution is HERE, and SmartyPants is leading it. <b>Two letter grades, PROVEN.</b></p>
<p>Old-fashioned teachers are scared. Parents who wait will watch their kids <b>fall behind forever</b>.</p>
<div class="native-ad"><span>Sponsored</span> 🤖 Try SmartyPants free for 7 days!</div>`,
        about: '<p>FutureNow Daily covers the tech that\'s changing everything.</p>',
        wiki: 'FutureNow Daily is a tech-news site owned by Rocket Seed Ventures, an investment firm that has invested in SmartyPants and other startups.',
        tells: ['Owned by an investor in SmartyPants (check Goosepedia)', '"PROVEN" from one company test', 'Uses fear ("fall behind forever")']
      },
      'brody-tutor': {
        kind: 'mixed', outlet: 'Study Hacks with Brody', domain: 'studyhackswithbrody.com', path: '/smartypants-review',
        theme: { bg: '#f0fdf4', ink: '#0b2814', accent: '#15803d', font: 'sans' },
        title: 'I Used SmartyPants for a Month (Honest Review)',
        snippet: 'Their own test was small, but my grades went up! Use my link for an extra free week…',
        byline: 'By Brody, study YouTuber',
        body: `<p>Quick facts: SmartyPants' "two letter grades" claim comes from their own test at one school. Small sample, I know.</p>
<p>But my grades went up this month, and lots of my viewers say the same! Worth trying. Use my link for an extra free week. 👇</p>
<p class="small">I'm a SmartyPants partner.</p>`,
        about: '<p>Brody makes study-tip videos for students.</p>',
        wiki: 'Study Hacks with Brody is a study-tips video channel. Brody is a paid SmartyPants partner.',
        tells: ['Gets the basic facts right about the company test', 'Then uses personal stories as if they were evidence', 'Paid partner of the company']
      },
      'smartypants-report': {
        kind: 'primary', outlet: 'SmartyPants AI (PDF)', domain: 'smartypants.ai', path: '/pilot-report.pdf',
        theme: { bg: '#fdfdfd', ink: '#222', accent: '#666', font: 'serif' },
        title: 'SmartyPants Pilot Report: Featherbrook Middle School',
        byline: 'SmartyPants AI, Inc. · Internal report',
        body: `<p><b>Participants:</b> 40 student volunteers at one school.</p>
<p><b>Design:</b> Students used SmartyPants for one term. Grades compared to the previous term. <b>No comparison group.</b></p>
<p><b>Result:</b> Average grade rose from C to B+, which we describe as "two letter levels."</p>
<p><b>Funding:</b> SmartyPants AI, Inc.</p>`,
        wiki: 'SmartyPants AI is a startup that sells a $30-a-month AI tutoring app.',
        tells: ['The original report: 40 volunteers, one school, no comparison group', '"C to B+" is not quite "two letter levels"']
      }
    }
  },
  {
    id: 'goosephone', lean: 'company-critic', query: 'goosephone battery video explode',
    tv: { icon: '📱', headline: 'VIRAL VIDEO: ARE GOOSEPHONE BATTERIES DANGEROUS?' },
    ask: {
      subject: 'your phone!!',
      body: `<p>There's a video going around showing a GoosePhone battery bursting into flames! You have a GoosePhone! Should you get rid of it right now??</p>`,
      text: `There's a viral video of a GoosePhone catching fire!! You have one! Should you throw it out??`,
      replies: [
        { text: `The video was edited and shows a different brand. There's no recall. The company is looking into two reports, and the safety board says no action is needed.`, verdict: 'good' },
        { text: 'GoosePhones explode! I\'m throwing mine in the lake!', verdict: 'bad' },
        { text: `Probably fine, but I'd return it just in case.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '🔎', headline: 'Fact-checkers trace viral phone video to unrelated brand' },
      mid: { icon: '📦', headline: 'GoosePhone returns spike despite no recall' },
      bad: { icon: '🌊', headline: 'Lake Moist cleanup crew pulls out dozens of tossed phones' },
      missed: { icon: '📢', headline: 'Exploding-phone video passes 2 million views' }
    },
    sponsored: 'honktel-ad', primary: 'csb-phone', results: ['consumer-phone', 'techtruth-phone', 'gadgetgabe-phone'],
    lesson: 'Trace claims: a viral video needs a source just like any other claim.',
    sites: {
      'honktel-ad': {
        kind: 'ad', outlet: 'HonkTel Phones', domain: 'honktel.com', path: '/switch',
        theme: { bg: '#fef2f2', ink: '#2a0606', accent: '#dc2626', font: 'sans' },
        title: 'Switch to HonkTel: The Phone That Never Explodes™', snippet: 'Worried about your phone? Trade in today and save $200.', byline: 'Sponsored content',
        body: '<p><b>Worried about your phone?</b> HonkTel: the phone that never explodes™. Trade in today!</p>',
        about: '<p>HonkTel makes smartphones.</p>',
        wiki: 'HonkTel is a phone company that competes with GoosePhone.',
        tells: ['Labeled "Sponsored": a paid ad', 'A competitor using the scare to sell its own phone']
      },
      'consumer-phone': {
        kind: 'reputable', outlet: 'Gander Consumer Report', domain: 'ganderconsumer.org', path: '/tech/goosephone-video',
        theme: { bg: '#f8fafc', ink: '#0f172a', accent: '#0f766e', font: 'serif' },
        title: 'That viral "exploding GoosePhone" video: what we found',
        snippet: 'The clip was edited from a 2019 video of a different brand. The safety board says no recall is needed…',
        byline: 'By Theo Nakamura, Tech Reporter · Monday',
        body: `<p>A video showing a phone bursting into flames has been shared millions of times with the caption "GoosePhone batteries are exploding." We traced it.</p>
<p>The clip was <b>edited from a 2019 video</b> of a <b>different brand</b> of phone. The GoosePhone logo was added later.</p>
<p>GoosePhone says it is looking into <b>two reports</b> of overheating. The <b>Consumer Safety Board</b> says there is <b>no recall</b> and no action is needed.</p>
<p class="source">Source: <a data-go="site:csb-phone" data-href="https://consumersafety.gov/statements/goosephone">Read the safety board's statement</a></p>`,
        about: '<p>Gander Consumer Report is an independent nonprofit that tests products. It accepts no advertising.</p>',
        wiki: 'Gander Consumer Report is an independent nonprofit consumer organization founded in 1962. It accepts no advertising and is known for careful product testing.',
        tells: ['Traced the video to its original source', 'Specific facts: edited, 2019, different brand, two reports', 'Links to the safety board\'s statement']
      },
      'techtruth-phone': {
        kind: 'partisan', outlet: 'TechTruth Exposed', domain: 'techtruthexposed.net', path: '/goosephone-fire',
        theme: { bg: '#18181b', ink: '#fafafa', accent: '#f97316', font: 'impact' },
        title: 'GOOSEPHONES ARE EXPLODING And The Company Is COVERING IT UP',
        snippet: 'WATCH the video they don\'t want you to see. Get rid of your GoosePhone NOW…',
        byline: 'TechTruth',
        body: `<p><b>WATCH the video they don't want you to see.</b> GoosePhones are EXPLODING and the company is COVERING IT UP.</p>
<p>Get rid of yours NOW before it's too late. Big Tech doesn't care about you!</p>
<div class="native-ad"><span>Sponsored</span> 📵 HonkTel: the phone that never explodes™</div>`,
        about: '<p>TechTruth exposes the lies of Big Tech.</p>',
        wiki: 'TechTruth Exposed is an anonymous website that posts alarming claims about tech companies. It is partly funded by ads from competing phone makers.',
        tells: ['Anonymous, funded by competitors\' ads (check Goosepedia)', 'Treats a video as proof without checking where it came from', '"COVERING IT UP" with no evidence']
      },
      'gadgetgabe-phone': {
        kind: 'mixed', outlet: 'GadgetGabe', domain: 'gadgetgabe.tech', path: '/goosephone-video-thoughts',
        theme: { bg: '#f8fafc', ink: '#111827', accent: '#4f46e5', font: 'sans' },
        title: 'The GoosePhone Video: Fake? Probably. But I\'d Still Return Mine.',
        snippet: 'Looks like the video was edited, and there\'s no recall. But why risk it?',
        byline: 'By Gabe Ortiz, gadget blogger',
        body: `<p>From what I can tell, the viral video was edited and shows a different phone. There's no recall.</p>
<p>But why risk it? If I had a GoosePhone, I'd return it just in case. (Check out my review of the new HonkTel!)</p>`,
        about: '<p>GadgetGabe reviews phones, laptops and headphones.</p>',
        wiki: 'GadgetGabe is a gadget review blog. It usually reports tech news accurately but often recommends products from its sponsors, including HonkTel.',
        tells: ['Gets the facts mostly right (edited video, no recall)', '"Just in case" isn\'t supported by those facts', 'Plugs a sponsor\'s competing phone']
      },
      'csb-phone': {
        kind: 'primary', outlet: 'Consumer Safety Board', domain: 'consumersafety.gov', path: '/statements/goosephone',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#334155', font: 'serif' },
        title: 'Statement on GoosePhone Overheating Reports',
        byline: 'Consumer Safety Board · Official statement',
        body: `<p>The Board is aware of a video circulating online. Our review found that it shows a <b>different product</b>.</p>
<p>GoosePhone has reported <b>two overheating complaints</b> out of more than one million phones sold, which is within normal ranges.</p>
<p><b>No recall is needed at this time.</b> As always, use the charger that came with your phone.</p>`,
        wiki: 'The Consumer Safety Board is the government agency that announces product recalls.',
        tells: ['The original statement: different product, two complaints out of a million, no recall']
      }
    }
  },
  {
    id: 'lake', lean: 'company-booster', query: 'lake moist water level shrinking',
    tv: { icon: '🏞️', headline: 'STATE SURVEY: LAKE MOIST IS SHRINKING' },
    ask: {
      subject: 'the lake',
      body: `<p>The news says Lake Moist is shrinking! But a guy at the hardware store said it's a hoax and the lake is fine. You study near it. What's the real story?</p>`,
      text: `News says Lake Moist is shrinking, but a guy at the hardware store says that's a hoax. What's the real story?`,
      replies: [
        { text: `The state survey found the lake dropped about 2 feet in 10 years, mostly from drought and more water pumped for farms. It's real, but slow.`, verdict: 'good' },
        { text: `It's a hoax! The lake is totally fine, it's just politics.`, verdict: 'bad' },
        { text: `I've seen the lake and it looks fine to me, so it's probably not a big deal.`, verdict: 'mid' }
      ]
    },
    followUp: {
      good: { icon: '🌱', headline: 'Farmers and city agree on water-saving plan for Lake Moist' },
      mid: { icon: '🤷', headline: 'Lake Moist plan stalls as residents shrug' },
      bad: { icon: '🏜️', headline: 'Water-saving plan scrapped after "hoax" campaign; lake keeps dropping' },
      missed: { icon: '📢', headline: '"Lake hoax" post spreads through fishing forums' }
    },
    sponsored: 'marina-ad', primary: 'lake-survey', results: ['gazette-lake', 'farmfreedom-lake', 'reeltalk-lake'],
    lesson: 'Find better coverage: one person\'s view of the lake is not the same as ten years of measurements.',
    sites: {
      'marina-ad': {
        kind: 'ad', outlet: 'Lake Moist Marina', domain: 'lakemoistmarina.com', path: '/rentals',
        theme: { bg: '#ecfeff', ink: '#082f49', accent: '#0284c7', font: 'sans' },
        title: 'Rent a Boat on Beautiful Lake Moist | Lake Moist Marina', snippet: 'The lake is waiting! Boats from $40/hour.', byline: 'Sponsored content',
        body: '<p><b>The lake is waiting!</b> Pontoons and kayaks from $40/hour.</p>',
        about: '<p>Lake Moist Marina rents boats on Lake Moist.</p>',
        wiki: 'Lake Moist Marina is a boat-rental business on Lake Moist.',
        tells: ['Labeled "Sponsored": a paid ad', 'A lake business that benefits from people not worrying about the lake']
      },
      'gazette-lake': {
        kind: 'reputable', outlet: 'The Gooseberry Gazette', domain: 'gooseberrygazette.com', path: '/environment/2026/lake-moist-survey',
        theme: { bg: '#fbf8f1', ink: '#1f1d1a', accent: '#1f4e79', font: 'serif' },
        title: 'Lake Moist has dropped about two feet in ten years, state survey finds',
        snippet: 'The State Water Survey points to years of drought and more water pumped for farms…',
        byline: 'By Priya Raman, Environment Reporter · Wednesday',
        body: `<p>Lake Moist's water level has dropped about <b>two feet over the past ten years</b>, according to a new report from the <b>State Water Survey</b>.</p>
<p>The survey points to two main causes: several years of <b>drought</b> and an increase in water <b>pumped from the lake for farm irrigation</b>.</p>
<p>"It's a slow change, but a real one," said survey hydrologist Dr. Ingrid Solberg. Farm groups say they are open to discussing water-saving steps.</p>
<p class="source">Source: <a data-go="site:lake-survey" data-href="https://statewatersurvey.gov/reports/lake-moist">Read the State Water Survey report</a></p>`,
        about: `<p>The Gooseberry Gazette has covered Gooseberry Falls since 1891.</p>`,
        wiki: 'The Gooseberry Gazette is a nonprofit local newspaper founded in 1891. It has won several regional journalism awards and publishes corrections openly. Media watchdogs rate it highly for accuracy.',
        tells: ['A named environment reporter', 'Ten years of measurements, with causes', 'Includes the farm groups\' view', 'Links to the survey']
      },
      'farmfreedom-lake': {
        kind: 'partisan', outlet: 'Farm Freedom Forum', domain: 'farmfreedomforum.org', path: '/lake-hoax',
        theme: { bg: '#fefce8', ink: '#271f04', accent: '#65a30d', font: 'impact' },
        title: 'The "Shrinking Lake" HOAX: Puddle Party Panic Exposed',
        snippet: 'The lake is FINE. This is just another Puddle Party scheme to control farmers…',
        byline: 'Forum Staff',
        body: `<p>The lake is <b>FINE</b>. This "shrinking lake" panic is just another <b>Puddle Party scheme</b> to control hardworking farmers.</p>
<p>Lakes go up and down. That's nature! Don't let the so-called "experts" fool you.</p>`,
        about: '<p>Farm Freedom Forum stands up for farmers against government overreach.</p>',
        wiki: 'Farm Freedom Forum is funded by the Big Valley Irrigation Association, a group of large farms that pump water from Lake Moist.',
        tells: ['Funded by farms that pump water from the lake (check Goosepedia)', '"HOAX" with no numbers', 'Attacks a political party and "so-called experts" instead of the data']
      },
      'reeltalk-lake': {
        kind: 'mixed', outlet: 'Reel Talk Fishing Blog', domain: 'reeltalkfishing.com', path: '/is-lake-moist-shrinking',
        theme: { bg: '#f0fdfa', ink: '#062420', accent: '#0f766e', font: 'sans' },
        title: 'Is Lake Moist Shrinking? I Fished It Yesterday and It Looked Fine',
        snippet: 'The survey says two feet in ten years. All I know is I caught a 12-pound catfish…',
        byline: 'By Hank Bream, angler',
        body: `<p>The state survey says the lake is down about two feet over ten years. Okay.</p>
<p>All I know is I fished it yesterday, caught a 12-pound catfish, and it looked fine to me. I wouldn't worry about it.</p>`,
        about: '<p>Reel Talk is a fishing blog about Lake Moist and nearby rivers.</p>',
        wiki: 'Reel Talk Fishing Blog is a personal fishing blog by local angler Hank Bream.',
        tells: ['Mentions the survey\'s number correctly', 'Then trusts one day of fishing over ten years of data']
      },
      'lake-survey': {
        kind: 'primary', outlet: 'State Water Survey', domain: 'statewatersurvey.gov', path: '/reports/lake-moist',
        theme: { bg: '#ffffff', ink: '#1b1b1b', accent: '#155e75', font: 'serif' },
        title: 'Lake Moist Water Level Report, 2016–2026',
        byline: 'State Water Survey · Hydrology Division',
        body: `<p><b>Finding:</b> Average water level down <b>2.1 feet</b> over ten years.</p>
<p><b>Main causes:</b> Below-average rainfall in 6 of 10 years; irrigation withdrawals up 35%.</p>
<p><b>Outlook:</b> If current trends continue, the shallow north end may become marsh within 15 years.</p>`,
        wiki: 'The State Water Survey is a state agency that measures rivers, lakes and groundwater.',
        tells: ['The original data: 2.1 feet in ten years, drought plus more irrigation']
      }
    }
  }
];
