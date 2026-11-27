import { useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, Building2, Check, ChevronRight, Clock, Factory, Leaf, MapPin, Menu, Recycle, Radio, ShieldCheck, Sun, Truck, Waves, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type PublicPageKey = 'about' | 'how' | 'technology' | 'impact' | 'contact'

type PageFeature = { icon: LucideIcon; title: string; description: string }
type PublicPageContent = {
  eyebrow: string
  title: string
  intro: string
  sectionEyebrow: string
  sectionTitle: string
  sectionIntro: string
  features: PageFeature[]
  note?: string
  secondaryHref: string
  secondaryLabel: string
}

const pageContent: Record<PublicPageKey, PublicPageContent> = {
  about: {
    eyebrow: 'ABOUT PLASTITRACK',
    title: 'A smarter system for a cleaner Ghana.',
    intro: 'PlastiTrack connects the people and information behind plastic collection, helping communities see what needs attention and where recovered material can go next.',
    sectionEyebrow: 'ONE CONNECTED NETWORK',
    sectionTitle: 'From scattered updates to shared action.',
    sectionIntro: 'A common operating picture can help local teams coordinate work without losing sight of material recovery.',
    secondaryHref: '/how-it-works',
    secondaryLabel: 'See how it works',
    features: [
      { icon: Building2, title: 'Community visibility', description: 'Bring participating locations and bin status into one operational view.' },
      { icon: Truck, title: 'Coordinated collection', description: 'Help partners prioritize collection tasks and follow progress through completion.' },
      { icon: Recycle, title: 'Material recovery', description: 'Make recovered plastic easier to identify and connect with recycling demand.' },
    ],
  },
  how: {
    eyebrow: 'HOW IT WORKS',
    title: 'From a signal to a better collection route.',
    intro: 'PlastiTrack turns bin status into practical next steps: monitor the network, prioritize attention, coordinate pickup, and record recovered material.',
    sectionEyebrow: 'A CLEARER COLLECTION CYCLE',
    sectionTitle: 'Four steps, one connected workflow.',
    sectionIntro: 'The demo uses simulated readings to show how each role can contribute to a more accountable process.',
    secondaryHref: '/technology',
    secondaryLabel: 'Explore the technology',
    features: [
      { icon: Radio, title: 'Monitor', description: 'Review fill-level and device-status readings across the demonstration network.' },
      { icon: Activity, title: 'Prioritize', description: 'Surface bins that may need attention so teams can plan the next collection.' },
      { icon: Truck, title: 'Collect', description: 'Assign collection work and record its status as the task progresses.' },
      { icon: Factory, title: 'Recover', description: 'List available material so recycling partners can review what is ready.' },
    ],
  },
  technology: {
    eyebrow: 'TECHNOLOGY & PROTOTYPE',
    title: 'Designed for connected collection.',
    intro: 'A device-ready platform pairs operational workflows with a future path for connected bins. The prototype image is a concept rendering, not deployed hardware.',
    sectionEyebrow: 'BUILT FOR THE FIELD',
    sectionTitle: 'A practical direction for smart-bin hardware.',
    sectionIntro: 'The supplied concept shows how power, sensing, and a protected enclosure could come together. Current demo readings are simulated.',
    secondaryHref: '/how-it-works',
    secondaryLabel: 'See the workflow',
    note: 'Prototype concept only. No physical PlastiTrack devices are represented as deployed or connected in this demo.',
    features: [
      { icon: Sun, title: 'Solar-ready concept', description: 'The rendering explores a solar panel as a potential power source for remote locations.' },
      { icon: Radio, title: 'Sensing and telemetry', description: 'Ultrasonic fill-level sensing and connectivity are part of the future integration path.' },
      { icon: ShieldCheck, title: 'Protected enclosure', description: 'Weather-resistant housing is shown as a design goal for field-ready equipment.' },
    ],
  },
  impact: {
    eyebrow: 'IMPACT & MEASUREMENT',
    title: 'Measure progress without overclaiming.',
    intro: 'Useful impact reporting starts with clear operational records. PlastiTrack is designed to help teams understand collection activity and material recovery over time.',
    sectionEyebrow: 'WHAT THE PLATFORM CAN TRACK',
    sectionTitle: 'Operational signals that support better decisions.',
    sectionIntro: 'These measures describe the demo workflow; real-world environmental outcomes require validated field data and agreed calculation methods.',
    secondaryHref: '/how-it-works',
    secondaryLabel: 'See how data moves',
    note: 'All readings and activity shown in the demo are simulated; they do not represent real collection or environmental impact.',
    features: [
      { icon: Clock, title: 'Response and completion', description: 'Compare alert-to-assignment and assignment-to-completion times.' },
      { icon: Recycle, title: 'Material recovered', description: 'Record material quantities and categories as collection tasks are completed.' },
      { icon: MapPin, title: 'Coverage and readiness', description: 'Review operational status by demonstration location and identify data gaps.' },
    ],
  },
  contact: {
    eyebrow: 'PILOTS & PARTNERSHIPS',
    title: 'Let’s make collection work better.',
    intro: 'PlastiTrack is a self-guided demonstration for communities, collection teams, and recycling partners exploring a more connected workflow.',
    sectionEyebrow: 'WHO THE DEMO IS FOR',
    sectionTitle: 'Explore the workflow from every side.',
    sectionIntro: 'There is no live contact or deployment booking system in this prototype. Use the demo to review the current experience and its intended roles.',
    secondaryHref: '/technology',
    secondaryLabel: 'Review the prototype',
    note: 'This prototype does not accept messages or schedule pilots. Demo accounts use simulated data only.',
    features: [
      { icon: Building2, title: 'Municipal teams', description: 'Review service visibility and operational reporting concepts.' },
      { icon: Truck, title: 'Collection partners', description: 'Explore task assignment, routing context, and completion tracking.' },
      { icon: Recycle, title: 'Recycling partners', description: 'See how available material could be presented for review.' },
    ],
  },
}

export function PublicPage({ page }: { page?: PublicPageKey }) {
  const active = page ? pageContent[page] : null
  const activePage = page ?? 'about'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="public-site">
      <header className="public-nav">
        <Link to="/" className="brand-lockup" onClick={() => setMobileMenuOpen(false)}><img className="brand-image" src="/plastitrack-logo.png?v=2" alt="PlastiTrack — Track, Collect, Recycle. A Cleaner Ghana, A Greener Tomorrow." /></Link>
        <nav className="public-links" aria-label="Main navigation">
          <Link to="/about">About</Link><Link to="/how-it-works">How it works</Link><Link to="/technology">Technology</Link><Link to="/impact">Impact</Link>
        </nav>
        <div className="public-nav-actions">
          <Link to="/contact" className="public-contact">Contact</Link>
          <Link to="/login" className="button button-dark button-small">Explore demo <ArrowUpRight size={15} /></Link>
          <button type="button" className="public-menu-toggle" aria-label={mobileMenuOpen ? 'Close site navigation' : 'Open site navigation'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {mobileMenuOpen && <nav className="public-mobile-menu" aria-label="Mobile navigation">{[['About', '/about'], ['How it works', '/how-it-works'], ['Technology', '/technology'], ['Impact', '/impact'], ['Contact', '/contact']].map(([label, href]) => <Link key={href} to={href} onClick={() => setMobileMenuOpen(false)}>{label}<ArrowRight size={15} /></Link>)}</nav>}
      </header>

      {activePage === 'contact' ? (
        <ContactPageContent />
      ) : active ? (
        <main className={`public-subpage public-subpage-${activePage}`}>
          <section className="subpage-hero">
            <div className="subpage-hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> {active.eyebrow}</div>
              <h1>{active.title}</h1>
              <p>{active.intro}</p>
              <div className="subpage-actions">
                <Link to="/login" className="button button-primary">Explore the demo <ArrowRight size={16} /></Link>
                <Link to={active.secondaryHref} className="text-link">{active.secondaryLabel} <ArrowUpRight size={15} /></Link>
              </div>
            </div>
            {activePage === 'how' ? (
              <figure className="prototype-figure how-video-figure">
                <video controls playsInline preload="metadata" aria-label="PlastiTrack how-it-works video">
                  <source src="/plastitrack-how-it-works.mp4?v=2" type="video/mp4" />
                  Your browser does not support embedded video.
                </video>
                <figcaption><span>HOW IT WORKS</span> A short walkthrough of the PlastiTrack collection process.</figcaption>
              </figure>
            ) : activePage === 'technology' ? (
              <figure className="prototype-figure">
                <img src="/plastitrack-prototype.png" alt="Concept rendering of a PlastiTrack smart-bin sensor, solar panel, sealed housing, and internal electronics." />
                <figcaption><span>PROTOTYPE CONCEPT</span> Illustrative design; hardware is not deployed in this demo.</figcaption>
              </figure>
            ) : (
              <div className={`subpage-visual subpage-visual-${activePage}`}>
                <div className="subpage-visual-topline"><span>PLASTITRACK WORKFLOW</span><span className="visual-demo-tag"><i /> DEMO DATA</span></div>
                <div className="visual-network">
                  <div className="visual-orbit visual-orbit-one" />
                  <div className="visual-orbit visual-orbit-two" />
                  <div className="visual-core"><Recycle size={35} /></div>
                  {active.features.slice(0, 3).map(({ icon: Icon, title }, index) => (
                    <div className={`visual-node visual-node-${index + 1}`} key={title}>
                      <span><Icon size={17} /></span><strong>{title}</strong>
                    </div>
                  ))}
                </div>
                <div className="visual-summary"><span><Activity size={17} /></span><div><small>CONNECTED OPERATIONS</small><strong>From signal to action</strong></div><ArrowUpRight size={16} /></div>
              </div>
            )}
          </section>

          <section className="subpage-details">
            <div className="subpage-section-heading">
              <div className="eyebrow"><span className="eyebrow-dot" /> {active.sectionEyebrow}</div>
              <h2>{active.sectionTitle}</h2>
              <p>{active.sectionIntro}</p>
            </div>
            <div className={`subpage-feature-grid subpage-feature-grid-${activePage}`}>
              {active.features.map(({ icon: Icon, title, description }, index) => (
                <article className="subpage-feature-card" key={title}>
                  <div className="subpage-feature-card-top"><span className="subpage-feature-icon"><Icon size={21} /></span><span className="subpage-feature-number">{String(index + 1).padStart(2, '0')}</span></div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            {active.note && <p className="subpage-note"><ShieldCheck size={17} /> {active.note}</p>}
          </section>
          <section className="subpage-cta">
            <span className="subpage-cta-icon"><Leaf size={22} /></span>
            <div><h2>See the PlastiTrack demo in action.</h2><p>Explore role-based workflows with clearly labelled simulated data.</p></div>
            <Link to="/login" className="button button-primary">Explore the demo <ArrowRight size={16} /></Link>
          </section>
        </main>
      ) : (
          <main>
            <section className="hero-section">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> INTELLIGENT WASTE INFRASTRUCTURE</div>
                <h1>Making Plastic Waste Collection <em>Smarter.</em></h1>
                <p>Know which bins need attention. Help collection teams act sooner. Connect recovered plastics with the recyclers ready to use them.</p>
                <div className="hero-actions"><Link to="/login" className="button button-primary">Explore the platform <ArrowRight size={17} /></Link><a href="#how-it-works" className="button button-outline">Learn how it works <ArrowDown size={16} /></a></div>
                <div className="hero-proof"><span className="proof-icon"><ShieldCheck size={16} /></span><span>Built for clear, accountable collection operations</span></div>
              </div>
              <div className="hero-visual">
                <div className="hero-map-label"><span className="live-dot" /> DEMO NETWORK <span>Central region</span></div>
                <div className="map-lines"><i /><i /><i /><i /><i /></div>
                <div className="map-watermark"><Waves size={64} /></div>
                <div className="map-pin pin-one"><span className="pin-dot pin-green" /><span className="pin-card"><strong>PT-001</strong><small>86% · Needs collection</small></span></div>
                <div className="map-pin pin-two"><span className="pin-dot pin-lime" /><span className="pin-card"><strong>PT-002</strong><small>52% · Filling</small></span></div>
                <div className="map-pin pin-three"><span className="pin-dot pin-gray" /><span className="pin-card"><strong>PT-003</strong><small>23% · Device offline</small></span></div>
                <div className="hero-stat-card"><span className="stat-label">SIMULATED BIN READING</span><strong>86<small>% capacity</small></strong><span><span className="trend-up">PT-001</span> · collection recommended</span></div>
                <div className="hero-visual-caption">Illustrative demonstration network · Locations are not operational sites</div>
              </div>
            </section>

            <section className="proof-strip">
              <div><strong>Connected</strong><span>Bin-level visibility</span></div><div><strong>Coordinated</strong><span>Teams act with context</span></div><div><strong>Circular</strong><span>Materials find a next use</span></div><div><strong>Measurable</strong><span>Impact data that matters</span></div>
            </section>

            <section className="content-section" id="how-it-works">
              <div className="section-heading">
                <div><div className="eyebrow"><span className="eyebrow-dot" /> HOW IT WORKS</div><h2>A better route from bin to <em>recycling.</em></h2></div>
                <p>Small, timely decisions add up. PlastiTrack connects the information and people needed to move plastic efficiently.</p>
              </div>
              <div className="steps-grid">
                <article className="step-card"><span className="step-number">01</span><span className="feature-icon"><Radio size={21} /></span><h3>Monitor</h3><p>Simulated smart-bin readings show fill levels and device connectivity in one place.</p><span className="step-arrow"><ChevronRight size={18} /></span></article>
                <article className="step-card"><span className="step-number">02</span><span className="feature-icon"><ClipboardIcon /></span><h3>Coordinate</h3><p>Collection recommendations help partners assign teams and follow each task to completion.</p><span className="step-arrow"><ChevronRight size={18} /></span></article>
                <article className="step-card"><span className="step-number">03</span><span className="feature-icon"><Recycle size={21} /></span><h3>Recover</h3><p>Available plastic is catalogued so recycling companies can request the materials they need.</p><span className="step-arrow"><ChevronRight size={18} /></span></article>
                <article className="step-card"><span className="step-number">04</span><span className="feature-icon"><MapPin size={21} /></span><h3>Understand</h3><p>Operational and environmental reporting reveals where performance can improve.</p><span className="step-arrow"><ChevronRight size={18} /></span></article>
              </div>
            </section>

            <section className="technology-band">
              <div className="technology-visual"><div className="device-ring ring-one" /><div className="device-ring ring-two" /><div className="device-core"><Radio size={28} /></div><div className="device-chip chip-left">FILL LEVEL <strong>86%</strong></div><div className="device-chip chip-right">CONNECTION <strong>ONLINE</strong></div><div className="technology-line" /></div>
              <div className="technology-copy"><div className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> DEVICE-READY BY DESIGN</div><h2>Useful now.<br /><em>Ready for what’s next.</em></h2><p>The demo uses simulated telemetry today. A clean device API boundary is designed to support future sensor integrations without confusing a simulation for connected hardware.</p><ul><li><Check size={17} /> Clear simulated vs. device readings</li><li><Check size={17} /> Threshold-based collection alerts</li><li><Check size={17} /> Future ESP32 and MQTT integration path</li></ul><Link to="/technology" className="text-link text-link-light">Explore the technology <ArrowRight size={16} /></Link></div>
            </section>

            <section className="impact-section"><div className="impact-callout"><span className="impact-icon"><Leaf size={22} /></span><div><div className="eyebrow">THE CIRCULAR OPPORTUNITY</div><h2>Less overflow. More material recovered.</h2><p>Bring collection infrastructure and recycling demand closer together — with transparent data at every step.</p></div><Link to="/impact" className="button button-outline">See the impact approach <ArrowRight size={16} /></Link></div></section>
          </main>
      )}
      <PublicFooter />
    </div>
  )
}

function ContactPageContent() {
  const [previewReady, setPreviewReady] = useState(false)

  function previewInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPreviewReady(true)
  }

  return <main className="public-subpage public-subpage-contact">
    <section className="contact-hero">
      <div className="contact-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> PILOTS & PARTNERSHIPS</div>
        <h1>Let’s make collection work better.</h1>
        <p>Have a question about the PlastiTrack concept? Choose the kind of partnership you’re exploring, then prepare a message with the demo contact form.</p>
        <div className="contact-audience-list">
          <article><span><Building2 size={18} /></span><div><strong>Municipal teams</strong><small>Explore collection visibility and reporting.</small></div></article>
          <article><span><Truck size={18} /></span><div><strong>Collection partners</strong><small>Review task assignment and pickup coordination.</small></div></article>
          <article><span><Recycle size={18} /></span><div><strong>Recycling partners</strong><small>See how recovered material can be presented.</small></div></article>
        </div>
        <Link to="/login" className="text-link">Explore the live demo instead <ArrowUpRight size={15} /></Link>
      </div>
      <section className="contact-form-panel">
        <div className="contact-form-heading"><span className="contact-form-icon"><Leaf size={19} /></span><div><span className="section-kicker">GET IN TOUCH</span><h2>Tell us what you’re exploring</h2></div></div>
        <p className="contact-form-intro">Share a little context and preview your inquiry.</p>
        <form className="contact-form" onSubmit={previewInquiry}>
          <label>Your name<input name="name" autoComplete="name" required placeholder="Name" onChange={() => setPreviewReady(false)} /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@organization.com" onChange={() => setPreviewReady(false)} /></label>
          <label className="contact-form-wide">Organization <span className="contact-optional">(optional)</span><input name="organization" autoComplete="organization" placeholder="Organization or community" onChange={() => setPreviewReady(false)} /></label>
          <label className="contact-form-wide">I’m interested in<select name="interest" defaultValue="Community partnership" onChange={() => setPreviewReady(false)}><option>Community partnership</option><option>Collection operations</option><option>Recycling partnership</option><option>Platform demonstration</option><option>Other</option></select></label>
          <label className="contact-form-wide">Message<textarea name="message" required rows={4} placeholder="What would you like to explore?" onChange={() => setPreviewReady(false)} /></label>
          <button className="button button-primary contact-submit" type="submit">Preview inquiry <ArrowRight size={16} /></button>
        </form>
        {previewReady && <p className="contact-preview-status" role="status"><Check size={16} /> Preview ready. This demo does not send or store your message.</p>}
        <p className="contact-demo-disclaimer"><ShieldCheck size={14} /> Demo form only — no message is sent or saved.</p>
      </section>
    </section>
    <section className="subpage-cta contact-bottom-cta">
      <span className="subpage-cta-icon"><Leaf size={22} /></span>
      <div><h2>Prefer to explore first?</h2><p>Sign in with any demo role to see the collection workflow from the inside.</p></div>
      <Link to="/login" className="button button-primary">Choose a demo account <ArrowRight size={16} /></Link>
    </section>
  </main>
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <section className="footer-newsletter">
          <div className="footer-newsletter-art" aria-hidden="true">
            <div className="footer-art-ring"><Recycle size={82} strokeWidth={1.3} /></div>
            <Leaf className="footer-art-leaf" size={48} strokeWidth={1.4} />
          </div>
          <div className="footer-newsletter-copy">
            <div className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> UPDATES & PARTNERSHIPS</div>
            <h2>Stay connected to a cleaner future.</h2>
            <p>Interested in PlastiTrack updates, a community pilot, or a recycling partnership? Let’s start a conversation.</p>
            <Link to="/contact" className="footer-newsletter-button">Get in touch <ArrowUpRight size={16} /></Link>
          </div>
        </section>

        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="brand-lockup">
              <img className="brand-image" src="/plastitrack-logo.png?v=2" alt="PlastiTrack — Track, Collect, Recycle." />
            </Link>
            <p>Smarter collection for a more circular future.</p>
            <span className="footer-brand-note">Built for clearer, more accountable waste operations.</span>
          </div>

          <nav className="footer-column" aria-label="Company">
            <h3>Company</h3>
            <Link to="/about">About us</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/impact">Our impact</Link>
          </nav>

          <nav className="footer-column" aria-label="Explore">
            <h3>Explore</h3>
            <Link to="/technology">Technology</Link>
            <Link to="/login">Platform demo</Link>
            <Link to="/contact">Partnerships</Link>
          </nav>

          <div className="footer-column footer-contact">
            <h3>Contact us</h3>
            <p>Have a question about collection, recycling, or a potential pilot?</p>
            <Link to="/contact" className="footer-contact-link">Talk to PlastiTrack <ArrowUpRight size={14} /></Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 PlastiTrack · Demonstration platform</p>
          <nav aria-label="Footer links">
            <Link to="/contact">Contact</Link>
            <Link to="/about">About</Link>
            <Link to="/impact">Impact</Link>
            <Link to="/login">Platform</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

function ClipboardIcon() {
  return <span className="clipboard-feature"><Check size={15} /></span>
}
