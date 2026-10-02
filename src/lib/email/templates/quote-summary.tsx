import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** All copy is passed in already translated, so the template stays locale-agnostic. */
export type QuoteSummaryEmailProps = {
  lang: string;
  logoUrl: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  referenceLabel: string;
  reference: string;
  eventLine: string;
  rows: Array<{ label: string; amount: string }>;
  subtotal: { label: string; amount: string };
  taxRows: Array<{ label: string; amount: string }>;
  total: { label: string; amount: string };
  depositLine: string;
  customTravel?: string;
  expiresLine: string;
  disclaimer: string;
  cta: { label: string; url: string };
  footer: string;
};

const ink = "#111111";
const paper = "#faf8f5";
const muted = "#6b6b6b";
const gold = "#c79856";
const line = "#e5e0d8";

function Line({ label, amount, strong }: { label: string; amount: string; strong?: boolean }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ margin: "6px 0" }}
    >
      <tbody>
        <tr>
          <td style={{ color: strong ? ink : muted, fontWeight: strong ? 600 : 400, fontSize: 14 }}>
            {label}
          </td>
          <td
            align="right"
            style={{
              color: ink,
              fontWeight: strong ? 600 : 400,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            {amount}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Client-facing quote summary (AGENTS.md §6.5). Transactional — no marketing content. */
export function QuoteSummaryEmail(props: QuoteSummaryEmailProps) {
  return (
    <Html lang={props.lang}>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body
        style={{
          backgroundColor: paper,
          color: ink,
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Section
            style={{ backgroundColor: ink, borderRadius: 12, padding: "24px", textAlign: "center" }}
          >
            <Img src={props.logoUrl} alt="Cad Studio" width={180} style={{ margin: "0 auto" }} />
          </Section>

          <Heading
            as="h1"
            style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 28, marginTop: 32 }}
          >
            {props.heading}
          </Heading>
          <Text style={{ fontSize: 15 }}>{props.greeting}</Text>
          <Text style={{ fontSize: 15, color: muted }}>{props.intro}</Text>

          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${line}`,
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {props.referenceLabel}
            </Text>
            <Text style={{ margin: "4px 0 0", fontSize: 20, fontFamily: "Georgia, serif" }}>
              {props.reference}
            </Text>
            <Text style={{ margin: "8px 0 0", fontSize: 14, color: muted }}>{props.eventLine}</Text>
            <Hr style={{ borderColor: line, margin: "16px 0" }} />
            {props.rows.map((item, index) => (
              <Line key={index} label={item.label} amount={item.amount} />
            ))}
            <Hr style={{ borderColor: line, margin: "12px 0" }} />
            <Line label={props.subtotal.label} amount={props.subtotal.amount} strong />
            {props.taxRows.map((item, index) => (
              <Line key={index} label={item.label} amount={item.amount} />
            ))}
            <Hr style={{ borderColor: gold, margin: "12px 0" }} />
            <Line label={props.total.label} amount={props.total.amount} strong />
            <Text style={{ margin: "4px 0 0", fontSize: 13, color: muted }}>
              {props.depositLine}
            </Text>
            {props.customTravel && (
              <Text style={{ margin: "12px 0 0", fontSize: 13, color: ink }}>
                {props.customTravel}
              </Text>
            )}
          </Section>

          <Text style={{ fontSize: 13, color: muted }}>{props.expiresLine}</Text>
          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={props.cta.url}
              style={{
                backgroundColor: gold,
                color: ink,
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {props.cta.label}
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: muted }}>{props.disclaimer}</Text>
          <Hr style={{ borderColor: line, margin: "24px 0" }} />
          <Text style={{ fontSize: 12, color: muted }}>{props.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
