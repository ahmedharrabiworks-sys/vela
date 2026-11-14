# Vela sales playbook (Doha, founding clients)

Read this before every demo. One goal per meeting: a yes to the 7-day free trial.

## What we sell, and nothing else

| We sell | We never promise |
|---|---|
| AI phone receptionist, Gulf Arabic and English, 24/7, answers every call, books into the calendar | Numbers ("you will get 30% more patients") |
| It knows their services, prices and hours; refuses closed days and double bookings | WhatsApp today (it is **coming soon**) |
| Every call, transcript and booking in one dashboard | Anything that is not live today |
| Instagram DM replies (see the note below) | Refunds or money back (never mention them) |

- **Pro** 1,500 QAR / month: phone agent (550 minutes), unlimited text, all channels. **Premium** 3,000 QAR / month: 1,000 minutes.
- **7-day free trial, cancel anytime. Setup is done by the Vela team.** They keep their number: we set up forwarding.
- **Founding 5** (see `config.json`, confirm the wording before using it): one of the first five clinics in Doha, set up personally by the founder.

> **Check before promising Instagram:** Instagram DM replies are built, but going live for a client's account still depends on Meta's app review. Until it is approved, offer Instagram as "being enabled" and lead with the phone receptionist.

## The 10-minute demo (in person or video)

**Before:** demo line ready (`DEMO_NUMBER` in `config.json`), their demo page or sample call open, dashboard logged in on a second screen, a pen and their price list if they have one.

| Minute | Do | Say |
|---|---|---|
| 0 to 1 | Thank them, name the problem in their words | "Your Instagram asks 'how much?' at night and nobody is there. That's the only thing I want to show you." |
| 1 to 2 | Play their personalised sample call (if made) | "This is your receptionist, trained on your public services. Listen to how it handles the booking." |
| 2 to 5 | **Hand them your phone. They call the demo line themselves**, in Arabic, and try to book. Encourage them to be difficult: ask a price, change the time, ask for a closed day. | "Call it. Try to trick it. Book something on a Friday." |
| 5 to 7 | Turn the second screen: the call appears in the dashboard with the full transcript, the summary and the booking in the calendar | "Everything it says, you can read. Nothing happens in the dark." |
| 7 to 8 | Show the Knowledge Base: their services and hours, editable | "It only says what you write here. Change a price, it knows instantly." |
| 8 to 9 | The offer: founding 5, trial, setup by us | "We set it up for you this week. Seven days free. If it doesn't earn its place, cancel." |
| 9 to 10 | Ask for the yes (below) | |

## Asking for the yes

- "Shall we start your seven days on Sunday? I need your services list and 20 minutes with whoever manages bookings."
- Gulf Arabic: "نبدأ الأسبوع التجريبي من الأحد؟ أحتاج قائمة خدماتكم و٢٠ دقيقة مع المسؤول عن الحجوزات."
- If they hesitate: ask what would have to be true for a yes. Solve that one thing, then ask again. Never discount on the spot.

## First 7 days (what they get)

Day 1: we load services, prices, hours and the greeting. Day 2: we set up forwarding together (after hours first, so their team keeps the day). Days 3 to 7: they read every call in the dashboard. Day 7: a 10-minute review call; continue on Pro or Premium, or cancel.

## The 12 likeliest objections

1. **"It's expensive."** 1,500 QAR is less than one missed treatment for most clinics, and less than a part-time night receptionist. It works nights, Fridays and Eid. *"خمسة عشر مية ريال أقل من موعد واحد يروح عليك."*
2. **"We already have a receptionist."** Keep her. Vela takes the calls she can't: after hours, during prayer, when two lines ring, when she's with a patient. Start with after-hours forwarding only. *"موظفتك تبقى، و Vela يرد لما هي مو موجودة."*
3. **"Does it really speak Gulf Arabic?"** Don't argue: hand them the phone and let them call. It answers in the dialect the caller uses and switches to English. *"اتصل عليه بنفسك وشوف."*
4. **"What if it says something wrong?"** It only answers from what you put in the Knowledge Base; anything outside it, it takes a message and flags it for your team. You read every transcript. *"ما يقول إلا اللي تكتبونه أنتم."*
5. **"What about patient privacy?"** Calls and transcripts stay in your account, visible only to you. It doesn't give medical advice; it books and answers practical questions. (Do not quote certifications we do not hold.) *"المكالمات لكم أنتم فقط."*
6. **"Is there a contract?"** No long contract. Monthly, 7-day free trial, cancel anytime. *"شهري، وتقدر توقف متى ما تبي."*
7. **"You're unknown."** True, we're new, so you get the founder on WhatsApp and a setup done personally. Judge it on the live call, not on a logo. *"جرّبه سبعة أيام واحكم بنفسك."*
8. **"Our patients want a human."** Vela answers in seconds and books; when someone asks for a person, it takes their details and flags the call for your team. The alternative at 11 pm is voicemail. *"أحسن من إن التلفون يرن وما أحد يرد."*
9. **"We're too busy to set it up."** We do the setup. We need your services list and 20 minutes once. *"إحنا نجهز كل شي."*
10. **"What about WhatsApp?"** Coming soon; today it's the phone (and Instagram once Meta approves it). The phone is where the bookings are lost after hours. *"الواتساب قريب."*
11. **"Will forwarding cost us?"** Today calls are forwarded to our line, which can be an international number; ask your operator about forwarding charges. We're moving to local Qatari numbers. Don't guess a figure. *"اسأل الشبكة عن رسوم التحويل، وقريبًا بيكون رقم قطري."*
12. **"What if our hours or prices change?"** Change them in the Knowledge Base (or send them to us) and Vela uses them on the next call. *"تغيّر السعر، يعرفه على طول."*

## After the meeting

`/sales-log <lead> demo-booked|trial|won|lost [note]`. A "no" is final for follow-ups. Anyone who asks not to be contacted: `/sales-log <lead> do-not-contact` (permanent).
