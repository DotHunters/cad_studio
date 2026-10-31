import {
  Body,
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
export type EventEnquiryReceivedEmailProps = {
  lang: string;
  logoUrl: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  facts: Array<{ label: string; value: string }>;
  /** The client's own message, echoed back (line breaks kept). */
  message: string;
  footer: string;
};

const ink = "#111111";
const paper = "#faf8f5";
const muted = "#6b6b6b";
const line = "#e5e0d8";

/** Client-facing copy of an "Events by CAD" enquiry. Transactional (no CASL opt-in needed). */
export function EventEnquiryReceivedEmail(props: EventEnquiryReceivedEmailProps) {
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
              padding: "16px 24px",
            }}
          >
            {props.facts.map((fact) => (
              <Text key={fact.label} style={{ fontSize: 14, margin: "8px 0" }}>
                <span style={{ color: muted }}>{fact.label}: </span>
                {fact.value}
              </Text>
            ))}
            <Hr style={{ borderColor: line }} />
            <Text style={{ fontSize: 14, whiteSpace: "pre-line" }}>{props.message}</Text>
          </Section>

          <Text style={{ fontSize: 12, color: muted, marginTop: 32, textAlign: "center" }}>
            {props.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
