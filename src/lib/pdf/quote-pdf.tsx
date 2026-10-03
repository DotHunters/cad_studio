import "server-only";

import {
  Document,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from "@react-pdf/renderer";

/** Everything printed, already translated and formatted (see the quote PDF route). */
export type QuotePdfData = {
  locale: "en" | "fr";
  title: string;
  studioName: string;
  studioLines: string[];
  issuedLine: string;
  clientLines: string[];
  facts: Array<{ label: string; value: string }>;
  rows: Array<{ label: string; amount: string }>;
  subtotal: { label: string; amount: string };
  taxRows: Array<{ label: string; amount: string }>;
  total: { label: string; amount: string };
  deposit: { label: string; amount: string } | null;
  notes: string[];
};

const INK = "#111111";
const MUTED = "#6B6B6B";
const GOLD = "#8A6430";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: INK, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontFamily: "Times-Roman", fontSize: 20, lineHeight: 1.2 },
  tagline: { fontSize: 7, letterSpacing: 2, color: GOLD, marginTop: 4 },
  muted: { color: MUTED },
  rule: { height: 1, backgroundColor: GOLD, width: 48, marginVertical: 14 },
  // Big text needs its own line height, or it overlaps the next line.
  title: { fontFamily: "Times-Roman", fontSize: 26, lineHeight: 1.2, marginBottom: 4 },
  section: { marginTop: 18 },
  label: { fontSize: 7, letterSpacing: 1.5, color: MUTED, marginBottom: 4 },
  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDDDDD",
  },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLine: {
    lineHeight: 1.3,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: INK,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  note: { fontSize: 8, color: MUTED, marginTop: 4 },
});

// The built-in PDF fonts can't draw U+202F (French number grouping): use a no-break space.
const printable = (value: string) => value.replace(/\u202f/g, "\u00a0");

function Line({
  label,
  amount,
  style,
}: {
  label: string;
  amount: string;
  style?: ViewProps["style"];
}) {
  return (
    <View style={style ?? styles.line} wrap={false}>
      <Text style={{ flex: 1, paddingRight: 12 }}>{printable(label)}</Text>
      <Text>{printable(amount)}</Text>
    </View>
  );
}

function QuoteDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document title={data.title} author={data.studioName} language={data.locale}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.studioName}</Text>
            <Text style={styles.tagline}>COLLECTION ART DESIGN</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {data.studioLines.map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.muted}>{printable(data.issuedLine)}</Text>
        <View style={styles.rule} />

        <View>
          {data.clientLines.map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </View>

        <View style={styles.section}>
          {data.facts.map((fact) => (
            <View key={fact.label} style={styles.factRow}>
              <Text style={styles.muted}>{fact.label}</Text>
              <Text>{printable(fact.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          {data.rows.map((row, index) => (
            <Line key={index} {...row} />
          ))}
          <Line {...data.subtotal} />
          {data.taxRows.map((row) => (
            <Line key={row.label} {...row} />
          ))}
          <Line {...data.total} style={styles.totalLine} />
          {data.deposit && <Line {...data.deposit} />}
        </View>

        <View style={styles.section}>
          {data.notes.map((note) => (
            <Text key={note} style={styles.note}>
              {printable(note)}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

/** A one-page, branded quote PDF (AGENTS.md §6.5, §6.10). */
export function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument data={data} />);
}
