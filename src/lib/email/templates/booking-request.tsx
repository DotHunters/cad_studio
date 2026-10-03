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
export type BookingRequestEmailProps = {
  lang: string;
  logoUrl: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  referenceLabel: string;
  reference: string;
  facts: Array<{ label: string; value: string }>;
  /** Free text block, e.g. the studio's payment instructions (line breaks kept). */
  details?: { title: string; text: string };
  nextTitle?: string;
  nextSteps?: string[];
  icsNote?: string;
  cta: { label: string; url: string };
  footer: string;
};

const ink = "#111111";
const paper = "#faf8f5";
const muted = "#6b6b6b";
const gold = "#c79856";
const line = "#e5e0d8";

/** Client-facing booking request confirmation (AGENTS.md §6.6). Transactional. */
export function BookingRequestEmail(props: BookingRequestEmailProps) {
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
            <Img
              src={props.logoUrl}
              alt="CAD Studio Photography"
              width={180}
              style={{ margin: "0 auto" }}
            />
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
            <Hr style={{ borderColor: line, margin: "16px 0" }} />
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                {props.facts.map((fact) => (
                  <tr key={fact.label}>
                    <td style={{ color: muted, fontSize: 14, padding: "4px 0" }}>{fact.label}</td>
                    <td align="right" style={{ color: ink, fontSize: 14, padding: "4px 0" }}>
                      {fact.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {props.details && (
            <>
              <Heading
                as="h2"
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 400,
                  fontSize: 20,
                  marginTop: 28,
                }}
              >
                {props.details.title}
              </Heading>
              <Text style={{ fontSize: 14, color: ink, whiteSpace: "pre-line" }}>
                {props.details.text}
              </Text>
            </>
          )}
          {props.nextTitle && props.nextSteps && props.nextSteps.length > 0 && (
            <>
              <Heading
                as="h2"
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 400,
                  fontSize: 20,
                  marginTop: 28,
                }}
              >
                {props.nextTitle}
              </Heading>
              {props.nextSteps.map((step, index) => (
                <Text key={index} style={{ fontSize: 14, color: ink, margin: "6px 0" }}>
                  {index + 1}. {step}
                </Text>
              ))}
            </>
          )}
          {props.icsNote && <Text style={{ fontSize: 13, color: muted }}>{props.icsNote}</Text>}

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
          <Hr style={{ borderColor: line, margin: "24px 0" }} />
          <Text style={{ fontSize: 12, color: muted }}>{props.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
