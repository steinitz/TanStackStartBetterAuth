import React from 'react'

export const Pricing = () => {
  return (
    <>
      <h1>Pricing & Credits</h1>
      <p>We believe in transparent, usage-based pricing. You only pay for what you use.</p>

      <section>
        <aside>
          <h3>Free Tier</h3>
          <p>$0</p>
          <p>Perfect for trying out the analysis tools.</p>
          <ul>
            <li>3 analyses per day</li>
            <li>Basic move descriptions</li>
            <li>Community support</li>
          </ul>
        </aside>

        <aside>
          <h3>Credit Packs</h3>
          <p>Pay-As-You-Go</p>
          <p>Unlock more depth and volume with credits.</p>
          <ul>
            <li>Detailed AI breakdowns</li>
            <li>Save unlimited hurdles</li>
            <li>Priority processing</li>
          </ul>
          <small>Credits are purchased in packs and consumed per analysis.</small>
        </aside>
      </section>

      <section>
        <h3>No Surprises</h3>
        <p>There are no monthly subscriptions for credit packs. You buy them once, and they stay in your account until used. We'll always warn you if you're running low.</p>
      </section>
    </>
  )
}
