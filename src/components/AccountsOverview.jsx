import { money } from "../lib/health.js";

function Row({ icon, label, sub, amount, debt }) {
  return (
    <li className="acct-row">
      <span className={`acct-icon ${debt ? "debt" : ""}`}>{icon}</span>
      <div className="acct-main">
        <div className="acct-label">{label}</div>
        <div className="acct-sub">{sub}</div>
      </div>
      <div className={`acct-amt ${debt ? "neg" : ""}`}>{debt ? "−" : ""}{money(amount)}</div>
    </li>
  );
}

export default function AccountsOverview({ customer, totals }) {
  const a = customer.accounts;
  const spending = Object.values(customer.monthlySpending).reduce((s, n) => s + n, 0);
  const debtPayments = a.creditCard.monthlyPayment + a.autoLoan.monthlyPayment;
  const leftOver = customer.monthlyNetIncome - spending - debtPayments;
  return (
    <section className="card">
      <div className="card-head">
        <h2>Your accounts</h2>
      </div>

      <div className="networth">
        <div className="muted">Net worth</div>
        <div className="networth-num">{money(totals.netWorth)}</div>
        <div className="muted small">
          {money(totals.assets)} in assets · {money(totals.debts)} in debt
        </div>
      </div>

      <div className="group-title">Money you have</div>
      <ul className="acct-list">
        <Row icon="🏦" label={a.checking.label} sub="Everyday spending" amount={a.checking.balance} />
        <Row icon="🐖" label={a.savings.label} sub={`${a.savings.apy}% APY`} amount={a.savings.balance} />
        <Row icon="🔒" label={a.cd.label} sub={`${a.cd.term} · ${a.cd.apy}% APY`} amount={a.cd.balance} />
        <Row icon="🌱" label={a.ira.label} sub="Retirement" amount={a.ira.balance} />
      </ul>

      <div className="group-title">Money you owe</div>
      <ul className="acct-list">
        <Row
          debt
          icon="💳"
          label={a.creditCard.label}
          sub={`${a.creditCard.apr}% APR · ${money(a.creditCard.limit)} limit`}
          amount={a.creditCard.balance}
        />
        <Row
          debt
          icon="🚙"
          label={a.autoLoan.label}
          sub={`${a.autoLoan.vehicle} · ${a.autoLoan.apr}% APR`}
          amount={a.autoLoan.balance}
        />
      </ul>

      <div className="flow">
        <div className="flow-title">Your month</div>
        <div className="flow-row"><span>Take-home pay</span><span>{money(customer.monthlyNetIncome)}</span></div>
        <div className="flow-row"><span>Spending &amp; bills</span><span>−{money(spending)}</span></div>
        <div className="flow-row"><span>Debt payments</span><span>−{money(debtPayments)}</span></div>
        <div className="flow-row total"><span>Left over</span><b>{leftOver >= 0 ? "" : "−"}{money(Math.abs(leftOver))}</b></div>
      </div>
    </section>
  );
}
