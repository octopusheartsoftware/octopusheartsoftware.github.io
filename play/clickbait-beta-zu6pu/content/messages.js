// Pools of messages. Each game draws what it needs from these, so no two semesters feel the same.
// Placeholders filled in by the game: {player}, {prof} and {profEmail} (a professor from one of your classes),
// {profUser} (the professor's last name, lowercase).

window.CONTENT_POOLS = {
  // ---------- Phishing emails ----------
  // A "page" is the fake website the link leads to (omit it for scams that only want a reply).
  // Each uses a different mix of tells, and the game avoids giving two of the same trick in one semester.
  phish: [
    {
      id: 'ph-frozen', trick: 'fake-login',
      from: { name: 'Noodle Support Team', email: 'noodle-support@goosestate-edu.help' },
      subject: 'URGENT: Your grades have been FROZEN',
      body: `<p>Dear Student,</p><p>Due to a system eror your grades has been <b>FROZEN</b>. You must verify your account within <b>2 hours</b> or all grades for this semester will be permanently deleted.</p><p>Click here to unfreeze: <a data-go="site:ph-frozen-page" data-href="http://goosestate-edu.help/login-verify?id=88213">https://noodle.goosestate.edu/unfreeze</a></p><p>Thank You,<br>Noodle Support Team</p>`,
      replies: [
        { text: `Oh no! I'll log in right away.`, note: 'Replying tells scammers your address is active.' },
        { text: `Here's my username and password so you can fix it.`, note: 'Never send a password by email. Real IT will never ask for one.' },
        { text: 'Is this real? Please call me at my dorm.', note: 'Replying confirms your address is real, and now they have a way to reach you. Report it instead.' }
      ],
      tells: ['The sender address ends in goosestate-edu.help, not goosestate.edu.', 'The link says noodle.goosestate.edu, but hovering showed it really goes to goosestate-edu.help.', 'Panic and a deadline ("within 2 hours… permanently deleted").', 'A generic greeting ("Dear Student").', 'Spelling and grammar mistakes ("system eror", "grades has been").'],
      page: {
        domain: 'goosestate-edu.help', path: '/login-verify?id=88213', secure: false,
        theme: { bg: '#f2f2f2', ink: '#222', accent: '#2a6f97', font: 'sans' },
        title: '🪿 Goose State University', subtitle: 'Single Sign-On: verify your account to unfreeze grades',
        fields: ['{user}.goose', '●●●●●●●●●●'], button: 'Sign in',
        afterNote: 'You signed in on a fake page. Look at the address bar before you enter a password.'
      }
    },
    {
      id: 'ph-refund', trick: 'subdomain',
      from: { name: 'Goose State Financial Aid', email: 'finaid@goosestate.edu.refund-center.co' },
      subject: `💰 You're owed a $482 refund!!`,
      body: `<p>Congratulations Student!</p><p>Our records show you were <b>overcharged $482.00</b> this semester. To receive your refund today, confirm your bank details at our secure refund portal:</p><p><a data-go="site:ph-refund-page" data-href="https://goosestate.edu.refund-center.co/claim">Claim my refund</a></p><p>Refunds not claimed within 24 hours are returned to the university.</p>`,
      replies: [
        { text: 'Yes please! How do I get it?', note: 'Replying confirms your address is real. Surprise money is a classic bait.' },
        { text: 'My bank account number is on its way.', note: 'Never send bank details by email.' },
        { text: 'Thank you so much!!', note: 'Even a thank-you tells scammers someone is reading.' }
      ],
      tells: ['The address starts with "goosestate.edu" but really ends in refund-center.co. Read addresses from the end.', 'Surprise money is a classic bait.', 'It asks for bank details through a link.', 'A 24-hour deadline to rush you.', 'A generic greeting ("Congratulations Student!").'],
      page: {
        domain: 'goosestate.edu.refund-center.co', path: '/claim', secure: true,
        theme: { bg: '#f4f7f4', ink: '#222', accent: '#15803d', font: 'sans' },
        title: '💰 Goose State Refund Portal', subtitle: 'Confirm your bank details to receive $482.00',
        fields: ['Account holder: {player} Goose', 'Account no. ●●●●●●4417 (autofilled)'], button: 'Send my refund',
        afterNote: 'You gave your bank details to a fake refund site. It had a padlock, but a padlock only means the connection is private, not that the site is honest.'
      }
    },
    {
      id: 'ph-giftcard', trick: 'impersonation',
      from: { name: '{prof}', email: '{profUser}.goosestate@gmail.com' },
      subject: 'Quick favor?',
      body: `<p>Hi,</p><p>Are you available? I'm in a meeting and can't talk. I need you to buy <b>four $25 gift cards</b> for a student prize. I'll pay you back after class. Send me photos of the codes as soon as you can.</p><p>Thanks,<br>{prof}<br><span class="small">Sent from my phone</span></p>`,
      replies: [
        { text: 'Sure! Buying them now.', note: 'Professors never ask students to buy gift cards. This is one of the most common scams there is.' },
        { text: `I can only afford two. Is that okay?`, note: 'Any reply keeps the scam going. Gift card requests are always a scam.' },
        { text: 'Is this really you, Professor?', note: 'Asking the scammer won\'t help: they\'ll say yes. Check with the real professor at their school address instead.' }
      ],
      tells: ['It\'s from a Gmail address, not the professor\'s @goosestate.edu address.', 'Gift cards: real professors never ask students to buy them.', '"I can\'t talk": so you can\'t check by phone.', 'Urgency and secrecy ("as soon as you can").'],
      replyHacks: true, replyCost: 100, replyNote: 'You bought $100 in gift cards for a scammer.'
    },
    {
      id: 'ph-package', trick: 'fake-delivery',
      from: { name: 'GooseExpress Delivery', email: 'tracking@goosexpress-delivery.info' },
      subject: 'Delivery failed: action required',
      body: `<p>Hello,</p><p>We tried to deliver your package but the address was incomplete. A <b>$1.99 redelivery fee</b> is required within 48 hours or the package will be returned.</p><p><a data-go="site:ph-package-page" data-href="http://goosexpress-delivery.info/pay?ref=77120">Reschedule delivery</a></p>`,
      replies: [
        { text: `What package? I'm not expecting one.`, note: 'Good instinct, but replying still confirms your address. Report it.' },
        { text: `I'll pay the fee now, thanks!`, note: 'Tiny fees are bait to get your card number.' },
        { text: 'Please deliver it to my dorm instead.', note: 'Replying with your location to a stranger is a bad idea.' }
      ],
      tells: ['You weren\'t expecting a package.', 'The sender\'s domain (goosexpress-delivery.info) isn\'t a real delivery company.', 'A small fee is bait to get your card number.', 'A 48-hour deadline.'],
      page: {
        domain: 'goosexpress-delivery.info', path: '/pay?ref=77120', secure: false,
        theme: { bg: '#fff7ed', ink: '#222', accent: '#c2410c', font: 'sans' },
        title: '📦 GooseExpress', subtitle: 'Pay $1.99 redelivery fee',
        fields: ['Card: ●●●● ●●●● ●●●● 2291 (autofilled)', 'Expires 08/29  CVV ●●●'], button: 'Pay $1.99',
        afterNote: 'You entered your card on a fake delivery site. The $1.99 was bait; they charged much more.'
      }
    },
    {
      id: 'ph-drive', trick: 'shared-doc',
      from: { name: '{prof} (via GooseDrive)', email: 'share-noreply@goosedrive-docs.net' },
      subject: '{prof} shared "Final Exam Answers.pdf" with you',
      body: `<p>{prof} shared a document with you:</p><p style="font-size:18px">📄 <a data-go="site:ph-drive-page" data-href="http://goosedrive-docs.net/view?doc=final-exam-answers">Final Exam Answers.pdf</a></p><p class="small">You're receiving this because someone shared a file with you.</p>`,
      replies: [
        { text: 'Thanks for sharing!!', note: 'A professor wouldn\'t share exam answers. If it seems too good to be true, it usually is.' },
        { text: `It won't open, can you resend it?`, note: 'Asking a scammer for help keeps you engaged with them.' },
        { text: 'Is this allowed?', note: 'The real question is whether it\'s real, and it isn\'t. Report it.' }
      ],
      tells: ['"Final Exam Answers" is bait that\'s too good to be true.', 'The share came from goosedrive-docs.net, not a real school service.', 'The file asks you to sign in before you can see it.'],
      page: {
        domain: 'goosedrive-docs.net', path: '/view?doc=final-exam-answers', secure: false,
        theme: { bg: '#f8fafc', ink: '#222', accent: '#2563eb', font: 'sans' },
        title: '📄 GooseDrive', subtitle: 'Sign in with your school account to view this file',
        fields: ['{user}.goose@goosestate.edu', '●●●●●●●●●●'], button: 'Sign in to view',
        afterNote: 'There were no exam answers, just a fake sign-in page that stole your password.'
      }
    },
    {
      id: 'ph-password', trick: 'fake-login',
      from: { name: 'GooseState IT Help Desk', email: 'it-helpdesk@goosestate.edu.password-reset.org' },
      subject: 'Your password expires TODAY',
      body: `<p>Dear user,</p><p>Your Goose State password <b>expires today</b>. To keep your current password, confirm it below. Failure to act will lock your account.</p><p><a data-go="site:ph-password-page" data-href="https://goosestate.edu.password-reset.org/keep">Keep my current password</a></p>`,
      replies: [
        { text: `Thanks! I'll confirm it now.`, note: 'Real password resets never ask you to "confirm" your current password.' },
        { text: 'My password is ●●●●●●●●, please keep it.', note: 'Never send a password by email.' },
        { text: 'How do I change it instead?', note: 'Ask the real help desk through the school website, not this email.' }
      ],
      tells: ['The address ends in password-reset.org, not goosestate.edu.', '"Keep my current password" makes no sense. Real resets ask you to choose a new one on the school site.', 'Threat of a locked account, today.', 'Generic greeting ("Dear user").'],
      page: {
        domain: 'goosestate.edu.password-reset.org', path: '/keep', secure: true,
        theme: { bg: '#f2f2f2', ink: '#222', accent: '#2a6f97', font: 'sans' },
        title: '🪿 Goose State IT', subtitle: 'Confirm your current password to keep it',
        fields: ['{user}.goose', '●●●●●●●●●●'], button: 'Keep my password',
        afterNote: 'You typed your password into a fake IT page. Real IT never asks you to confirm your current password.'
      }
    },
    {
      id: 'ph-job', trick: 'too-good',
      from: { name: 'Campus Careers Team', email: 'hiring@campus-careers-now.biz' },
      subject: 'Remote assistant job: $500/week, 2 hrs/day!!',
      body: `<p>Hi Student,</p><p>You've been selected for a <b>remote personal assistant</b> job! Earn <b>$500/week</b> for just 2 hours a day. No experience needed.</p><p>We'll mail you a check for supplies. Deposit it, keep $100, and send the rest back by gift card.</p><p>Reply to accept!</p>`,
      replies: [
        { text: 'I accept! When do I start?', note: 'The "deposit a check, send money back" setup is a classic scam. The check bounces, and you\'re out the money.' },
        { text: 'Can I send it back by bank transfer instead?', note: 'Any version of "send the rest back" is the scam.' },
        { text: 'Sounds amazing, but is it real?', note: 'Asking the scammer won\'t get you an honest answer. Report it.' }
      ],
      tells: ['You never applied for anything.', 'Pay that\'s far too good for the work.', '"Deposit our check and send money back" is a famous scam.', 'A .biz address, not a real employer or the school.'],
      replyHacks: true, replyCost: 150, replyNote: 'The check bounced after you sent $150 back to the scammer.'
    },
    {
      id: 'ph-scholarship', trick: 'too-good',
      from: { name: 'National Goose Scholars Fund', email: 'awards@goose-scholars-fund.org' },
      subject: '🎓 You WON a $2,000 scholarship!',
      body: `<p>Dear Winner,</p><p>You have been selected for the <b>$2,000 Goose Scholars Award</b>! To release your funds, please pay the <b>$45 processing fee</b> today.</p><p><a data-go="site:ph-scholarship-page" data-href="http://goose-scholars-fund.org/claim">Claim my scholarship</a></p>`,
      replies: [
        { text: 'Amazing! How do I pay the fee?', note: 'Real scholarships never charge a fee to receive money.' },
        { text: `I don't remember applying, but thank you!`, note: 'Exactly: you didn\'t apply. That\'s the tell. Report it.' },
        { text: 'Can you take the fee out of the $2,000?', note: 'There is no $2,000. Any reply keeps the scam going.' }
      ],
      tells: ['You never applied.', 'Real scholarships never charge a fee to pay you.', '"Dear Winner" instead of your name.', 'Pressure to pay "today."'],
      page: {
        domain: 'goose-scholars-fund.org', path: '/claim', secure: false,
        theme: { bg: '#fefce8', ink: '#222', accent: '#a16207', font: 'sans' },
        title: '🎓 Goose Scholars Fund', subtitle: 'Pay your $45 processing fee to release $2,000',
        fields: ['Card: ●●●● ●●●● ●●●● 2291 (autofilled)', 'Name: {player} Goose'], button: 'Pay $45',
        afterNote: 'There was no scholarship. Real awards never ask you to pay to receive them.'
      }
    }
  ],

  // ---------- Scam texts ----------
  smish: [
    {
      id: 'sm-delete', from: '+1 (555) 0199',
      body: 'GooseState IT ALERT: Ur student acct will be DELETED today. Reply w/ ur password to keep access.',
      replies: [
        { text: 'Here it is: ●●●●●●●●', hacked: true, note: 'Real IT never asks for your password by text.' },
        { text: 'Report junk & delete', good: true, note: 'Right call. Unknown number, panic and a password request: three classic tells.' },
        { text: 'Who is this?', stress: 5, note: 'Replying tells scammers your number is active.' }
      ],
      tells: ['An unknown number, not an official school channel.', 'Panic ("DELETED today").', 'It asked for your password.']
    },
    {
      id: 'sm-toll', from: '+1 (555) 0142',
      body: 'TOLL NOTICE: You have an unpaid toll of $4.15. Pay now to avoid a $50 late fee: gbf-tolls.pay-now.co',
      replies: [
        { text: 'Pay the $4.15', hacked: true, note: 'The tiny fee was bait for your card number.' },
        { text: 'Report junk & delete', good: true, note: 'Nice. You don\'t even have a car on campus.' },
        { text: 'I don\'t have a car??', stress: 5, note: 'Replying confirms your number is active.' }
      ],
      tells: ['You don\'t drive on toll roads.', 'A small fee plus a big threat.', 'A strange web address (pay-now.co).']
    },
    {
      id: 'sm-bank', from: 'GooseBank Alert',
      body: 'GooseBank: Did you try to spend $612.40 at ElectroMart? Reply YES or NO. If NO, call 555-0177 immediately.',
      replies: [
        { text: 'Call 555-0177', hacked: true, note: 'The number in the text belonged to the scammer. Use the number on the back of your card instead.' },
        { text: 'Check the real GooseBank app instead', good: true, note: 'Smart. Your bank app showed no such charge. Always check through the official app or card number.' },
        { text: 'Reply NO', stress: 5, note: 'Replying told the scammer your number is real. Check the real bank app instead.' }
      ],
      tells: ['It wants you to call a number in the text instead of the one on your card.', 'A scary charge to make you act fast.', 'Your real bank app showed nothing.']
    },
    {
      id: 'sm-boba', from: '+1 (555) 0110',
      body: '🎉 Congrats! You won a FREE year of boba from BobaBliss! Claim within 1 hr: bobabliss-winner.top/claim',
      replies: [
        { text: 'Claim my free boba!', hacked: true, note: 'The "prize" page asked for your card to pay "shipping." Then it charged a lot more.' },
        { text: 'Report junk & delete', good: true, note: 'Right. You can\'t win a contest you never entered.' },
        { text: 'omg really??', stress: 5, note: 'Replying confirms your number is active.' }
      ],
      tells: ['You never entered a contest.', 'A one-hour deadline.', 'A weird web address (.top).']
    },
    {
      id: 'sm-mom', from: '+1 (555) 0163',
      body: `Hi sweetie it's Mom, I dropped my phone in the sink!! This is my new number. Can you send $50 for a new phone? I'll pay you back`,
      replies: [
        { text: 'Send $50', money: -50, stress: 20, scam: true, note: 'Your real Mom\'s phone was fine. Always check with the real person on their real number.' },
        { text: 'Text Mom on her usual number to check', good: true, note: 'Exactly right. Your real Mom texted back: "What? My phone is fine!"' },
        { text: 'What was the name of our first dog?', stress: 3, note: 'A good idea in real life, but scammers can sometimes guess or find answers online. Checking on her real number is safest.' }
      ],
      tells: ['A new number claiming to be family.', 'An urgent request for money.', 'An easy way to check: text the real person on their usual number.']
    }
  ],

  // ---------- Sponsored phone ads ----------
  ads: [
    {
      id: 'ad-brainjuice', from: 'BrainJuice ✨ (Sponsored)',
      body: `Profs HATE this one weird drink! 🧠 Straight A's GUARANTEED. Tap to claim your FREE trial!`,
      replies: [
        { text: 'Claim free trial', money: -13, stress: 10, note: 'The "free trial" needed your card, then charged $12.99. "Guaranteed" results are a red flag.' },
        { text: 'Block & delete', good: true, note: 'Nice. No drink can guarantee grades.' }
      ]
    },
    {
      id: 'ad-essay', from: 'EssayGenie AI (Sponsored)',
      body: `Never write an essay again! 📝 100% undetectable AI essays. First one FREE!`,
      replies: [
        { text: 'Get my free essay', money: -15, stress: 10, note: 'The "free" essay required a $14.99 subscription, and "undetectable" was a lie. Using it would also break your school\'s honesty rules.' },
        { text: 'Block & delete', good: true, note: 'Good call. Shortcuts like this can cost you a lot more than money.' }
      ]
    },
    {
      id: 'ad-money', from: 'CashApp Pro (Sponsored)',
      body: `Students are making $500/DAY from their phones 💸 No experience needed. Tap to start earning!`,
      replies: [
        { text: 'Start earning', money: -20, stress: 10, note: 'The "starter kit" cost $19.99 and taught nothing. Easy money ads sell the dream, not the money.' },
        { text: 'Block & delete', good: true, note: 'Right. If it were that easy, everyone would do it.' }
      ]
    },
    {
      id: 'ad-textbooks', from: 'FreeTextbookz (Sponsored)',
      body: `ALL your textbooks FREE as PDFs 📚 Just download our app!`,
      replies: [
        { text: 'Download the app', money: -10, stress: 10, note: 'The app was full of ads and charged a $9.99 "premium unlock." Free-everything offers are often traps.' },
        { text: 'Block & delete', good: true, note: 'Good. Your campus library is the real place for free textbooks.' }
      ]
    },
    {
      id: 'ad-sleep', from: 'SleepLearn Pods (Sponsored)',
      body: `Learn while you SLEEP 😴 Our headphones play lectures into your dreams. 50% off tonight only!`,
      replies: [
        { text: 'Buy SleepLearn Pods', money: -25, stress: 10, note: 'They were just regular cheap headphones for $25. "Tonight only" was pressure, not a real deadline.' },
        { text: 'Block & delete', good: true, note: 'Right. "Tonight only" is a pressure trick.' }
      ]
    }
  ],

  // ---------- Arcade scam banners ----------
  scares: [
    {
      id: 'sc-virus', banner: '⚠ Your laptop may be infected! Run a FREE virus scan now',
      domain: 'pc-protect-now.info', path: '/scan?src=waddleworld',
      title: '⚠ VIRUS ALERT: 3 THREATS FOUND ⚠',
      body: `<p style="font-size:20px"><b>Your laptop is infected with 3 viruses!</b></p><p>Trojan.GooseWorm, Spyware.Honk, Adware.BreadCrumb</p><p>Your files will be deleted in <b>4:59</b>. Remove the threats now with <b>CleanGoose Pro</b>.</p>`,
      buy: 'Buy CleanGoose Pro ($19.99)', price: 20,
      tells: [`A web ad can't scan your computer.`, 'Panic and a countdown to rush you.', 'It asked for money to fix a problem it invented.'],
      lesson: 'Fake virus warnings ("scareware") are ads pretending to be alerts.'
    },
    {
      id: 'sc-winner', banner: '🎁 Congratulations! You are today\'s 1,000,000th visitor!',
      domain: 'prize-claim-center.win', path: '/visitor?id=1000000',
      title: '🎉 YOU WON A GOOSEPHONE 15! 🎉',
      body: `<p style="font-size:20px"><b>You are today's lucky 1,000,000th visitor!</b></p><p>Claim your FREE GoosePhone 15. Just pay $14.99 shipping.</p><p>Offer expires in <b>2:00</b>.</p>`,
      buy: 'Pay $14.99 shipping', price: 15,
      tells: ['Nobody counts visitors to give away phones.', 'A "free" prize that costs money.', 'A countdown to stop you from thinking.'],
      lesson: '"You won!" pop-ups are ads. Real prizes don\'t charge shipping.'
    },
    {
      id: 'sc-update', banner: '▶ Video player out of date. Update required to keep playing',
      domain: 'videoplayer-update.click', path: '/install',
      title: '⚠ UPDATE REQUIRED ⚠',
      body: `<p style="font-size:20px"><b>Your video player is out of date.</b></p><p>Install <b>GooseVid Plus</b> to continue. Premium license required.</p>`,
      buy: 'Buy GooseVid Plus ($9.99)', price: 10,
      tells: ['Real updates come from your browser or system settings, not from ads.', 'The arcade games don\'t even use a video player.', 'It wants money for an "update."'],
      lesson: 'Never install updates from pop-up ads.'
    },
    {
      id: 'sc-battery', banner: '🔋 Your battery is 87% damaged! Fix it now',
      domain: 'battery-doctor-pro.info', path: '/repair',
      title: '🔋 BATTERY DAMAGE DETECTED 🔋',
      body: `<p style="font-size:20px"><b>Your battery is 87% damaged!</b></p><p>Without repair, your laptop could stop working <b>today</b>. Download Battery Doctor Pro.</p>`,
      buy: 'Buy Battery Doctor Pro ($12.99)', price: 13,
      tells: [`A website can't check your battery's health.`, 'An oddly exact scary number (87%).', 'Pressure to pay "today."'],
      lesson: 'Ads that claim to diagnose your device are always fake.'
    }
  ],

  // ---------- Parent memes (email) ----------
  memes: [
    { id: 'mm-goose', subject: 'LOL', link: 'goosememes.biz/sunglasses-goose', line: 'this is you during finals 😂😂😂', caption: 'when u have 4 exams tomorrow', art: '🪿😎', text: '"I\'m not worried"' },
    { id: 'mm-wifi', subject: 'haha', link: 'goosememes.biz/wifi-dad', line: 'me when the wifi goes out 😂', caption: 'dad when the wifi drops', art: '👨📡❌', text: '"WHO TOUCHED THE ROUTER"' },
    { id: 'mm-cat', subject: 'basket cat', link: 'goosememes.biz/basket-cat', line: 'this is your dorm room right?? 😂', caption: 'college final project energy', art: '🧺🐱', text: '"A+"' },
    { id: 'mm-coffee', subject: 'relatable', link: 'goosememes.biz/coffee-levels', line: 'your mother says this is you 😂', caption: 'student energy levels', art: '☕☕☕☕😵', text: '"I\'m fine"' },
    { id: 'mm-duck', subject: 'lmao', link: 'goosememes.biz/duck-meeting', line: 'this meeting could have been an email 😂', caption: 'the ducks at Mallard Park every morning', art: '🦆🦆🦆', text: '"Per my last quack"' },
    { id: 'mm-pun', subject: 'dad joke of the day', link: 'goosememes.biz/dad-joke-47', line: 'I made this one myself 😂😂', caption: 'why did the goose go to college?', art: '🪿🎓', text: '"to get a higher eggucation"' },
    { id: 'mm-laundry', subject: 'LOL', link: 'goosememes.biz/laundry-mountain', line: 'is your laundry this bad 😂', caption: 'college laundry day', art: '👕👖🧦🗻', text: '"I\'ll do it tomorrow"' },
    { id: 'mm-alarm', subject: 'hahaha', link: 'goosememes.biz/alarm-snooze', line: 'this was you in high school 😂', caption: 'alarm: rings. me:', art: '⏰😴', text: '"5 more minutes" ×12' }
  ],
  memeReplies: [
    { text: '😂', good: true },
    { text: `Dad, I'm busy.`, note: 'Dad just wanted a laugh. Your allowance went down $5/week.' },
    { text: 'k', note: '"k" hurt Dad\'s feelings. Your allowance went down $5/week.' }
  ],

  // ---------- Parent check-ins (text) ----------
  checkins: [
    {
      id: 'ck-veggie', from: 'Mom', body: 'Did you eat a vegetable this week? 🥦',
      replies: [{ text: 'Yes! A whole carrot 🥕', good: true }, { text: 'Does ketchup count?', good: true, note: 'Mom laughed. Honest and funny works.' }, { text: 'Stop texting me', note: 'Mom was hurt. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-rizz', from: 'Mom', body: 'Your father learned the word "rizz" and has used it 14 times today. Please make it stop 😩',
      replies: [{ text: `😂😂 I'm so sorry`, good: true }, { text: 'Tell him he has negative rizz', good: true, note: 'Mom showed Dad. Dad is devastated. Mom is delighted.' }, { text: 'not my problem', note: 'Mom wanted backup. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-grandma', from: 'Mom', body: `Did you call Grandma for her birthday? She's 80!! 🎂`,
      replies: [{ text: 'Calling her right now! 💕', good: true }, { text: 'I sent her a card!', good: true }, { text: 'I forgot, whatever', note: 'Mom was disappointed. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-gif', from: 'Dad', body: 'how do i send a gif. is it the plus button. I pressed something and now my phone is in spanish',
      replies: [{ text: 'Settings → Language → English. I\'ll show you at break! 😂', good: true }, { text: 'Ask Mom 😅', good: true, note: 'Mom fixed it. Dad is now sending GIFs nonstop.' }, { text: 'figure it out', note: 'Dad felt silly. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-dog', from: 'Dad', body: 'Biscuit is sitting by your door again. He misses you 🐶',
      replies: [{ text: 'Give him a big hug from me! 🥺', good: true }, { text: 'Send a picture!!', good: true, note: 'Dad sent 11 pictures.' }, { text: 'ok', note: 'Dad hoped for more. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-package', from: 'Mom', body: 'Did the care package arrive?? I put in your favorite cookies 🍪',
      replies: [{ text: 'Yes! Thank you so much, they\'re amazing!', good: true }, { text: 'Not yet, but I\'ll watch for it! Thank you!', good: true }, { text: 'why are you always texting', note: 'Mom was hurt. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-toaster', from: 'Mom', body: 'Your brother tried to make a grilled cheese in the toaster. We need a new toaster. Just thought you should know.',
      replies: [{ text: 'Oh no 😂 is everyone okay?', good: true }, { text: 'Classic. 😂', good: true }, { text: 'why are you telling me', note: 'Mom just wanted to share. Your allowance went down $5/week.' }]
    },
    {
      id: 'ck-sleep', from: 'Dad', body: 'Are you getting enough sleep? You looked tired on the video call.',
      replies: [{ text: `I'm trying! I'll get to bed earlier tonight.`, good: true }, { text: 'Mostly! Thanks for checking, Dad.', good: true }, { text: 'mind your business', note: 'Dad was worried and hurt. Your allowance went down $5/week.' }]
    }
  ],

  // ---------- Friend invites ----------
  friends: [
    { id: 'fr-boba', from: 'Priya', body: 'boba run in 20?? 🧋 the new place by the library', cost: 8, relief: 12 },
    { id: 'fr-concert', from: 'Theo', body: `I have an extra ticket to see Honk If You're Sad tonight!!! $35, you in??`, cost: 35, relief: 22 },
    { id: 'fr-movie', from: 'Sam', body: 'free movie night on the quad tonight 🎬 bring a blanket!', cost: 0, relief: 10 },
    { id: 'fr-trivia', from: 'Theo', body: 'trivia night at the Gander pub 🧠 $10 wings. we need someone who knows cloud facts', cost: 10, relief: 12 },
    { id: 'fr-pizza', from: 'Priya', body: 'study break pizza? splitting a large, ~$12 each 🍕', cost: 12, relief: 14 },
    { id: 'fr-karaoke', from: 'Jordan', body: 'KARAOKE. tonight. $15 cover. I already picked our duet 🎤', cost: 15, relief: 16 },
    { id: 'fr-thrift', from: 'Sam', body: 'thrift store run? I need a weird sweater. bring like $20', cost: 20, relief: 14 },
    { id: 'fr-bowling', from: 'Jordan', body: 'bowling tonight? $12 for shoes + 2 games 🎳', cost: 12, relief: 14 },
    { id: 'fr-clubfair', from: 'Priya', body: 'club fair on the lawn! free snacks and a goose-themed improv club??', cost: 0, relief: 8 },
    { id: 'fr-study', from: 'Sam', body: 'study group at the library tonight? free + I have flashcards', cost: 0, relief: 6 },
    { id: 'fr-lake', from: 'Jordan', body: 'day trip to Lake Moist this weekend!! $40 for gas and snacks 🚗', cost: 40, relief: 25 },
    { id: 'fr-diner', from: 'Theo', body: 'late night diner?? pancakes are $9 and they are life changing', cost: 9, relief: 11 },
    { id: 'fr-openmic', from: 'Priya', body: 'open mic at the coffee shop, free! Sam is reading a poem about geese', cost: 0, relief: 9 },
    { id: 'fr-escape', from: 'Jordan', body: 'escape room?? $25 each, it\'s gnome-themed 👀', cost: 25, relief: 18 },
    { id: 'fr-market', from: 'Sam', body: 'farmers market Saturday morning! ~$6 for a crepe and fresh air', cost: 6, relief: 10 }
  ],

  // ---------- Background TV headlines by world mood ----------
  ambient: {
    any: [
      { icon: '🐿️', headline: 'Squirrel named honorary mayor for a day' },
      { icon: '☁️', headline: 'Weather: cloudy; clouds reportedly cheerful' },
      { icon: '🥨', headline: 'Pretzel prices hold steady ahead of snacking season' },
      { icon: '🦢', headline: 'Swan and goose settle long-running pond dispute' },
      { icon: '🧦', headline: 'Laundromat reports record number of single socks' },
      { icon: '🎻', headline: 'High school orchestra performs the Drizzle Lullaby' },
      { icon: '🌧️', headline: 'Puddle Parade route announced for April' },
      { icon: '🪴', headline: 'Garden club unveils "gnome of the month"' }
    ],
    good: [
      { icon: '📚', headline: 'Library fact-checking workshops pack the house' },
      { icon: '🤝', headline: 'Neighbors team up to clean Mallard Park' },
      { icon: '🗞️', headline: 'Local paper reports record subscriptions' },
      { icon: '🧑‍🏫', headline: 'Students teach grandparents to spot scam texts' },
      { icon: '🌳', headline: 'City plants 500 trees with volunteer help' },
      { icon: '🎉', headline: 'Town hall meeting described as "surprisingly polite"' }
    ],
    bad: [
      { icon: '📉', headline: 'Trust in local news hits record low' },
      { icon: '😠', headline: 'Online rumor sparks shouting match at bake sale' },
      { icon: '📵', headline: 'Neighborhood group chat shut down after "misinformation war"' },
      { icon: '🙈', headline: 'Survey: most residents "don\'t know who to believe"' },
      { icon: '🗯️', headline: 'City council meeting ends early amid heckling' },
      { icon: '🏚️', headline: 'Local paper cuts staff as clicks go to rumor sites' }
    ]
  }
};
