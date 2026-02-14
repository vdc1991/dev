import React, { useMemo } from "react";
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import db from "./assets/data/panier_fute_base.json";

const Stack = createNativeStackNavigator();

/** =========================
 *  CONFIG USER (MVP)
 *  -> plus tard: écran préférences
 *  ========================= */
const userPrefsMVP = {
  budget: 45,
  jours: 7,
  personnes: 1,
  exclusions: ["porc", "fromage", "fruits_de_mer"], // toi
};

function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function CardPlan({ accentColor, icon, title, price, tags, description, examples, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { borderColor: accentColor }, pressed && { opacity: 0.92 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardPrice}>{price}</Text>
      </View>

      <View style={styles.cardChipsRow}>
        {tags.map((t, i) => (
          <Chip key={i} label={t} />
        ))}
      </View>

      <Text style={styles.cardDesc}>{description}</Text>

      <View style={styles.cardBottomRow}>
        {examples.map((t, i) => (
          <Text key={i} style={styles.cardMiniItem}>
            {t}
          </Text>
        ))}
      </View>

      <View style={{ marginTop: 12 }}>
        <View style={[styles.chooseBtn, { borderColor: accentColor }]}>
          <Text style={styles.chooseBtnText}>Choisir</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** =========================
 *  LOGIQUE MVP (simple)
 *  - filtre exclusions
 *  - génère une liste à partir des slots du template
 *  - calcule total
 *  - calcule barre équilibre
 *  ========================= */

function hasExcludedTagOrRule(item, exclusions) {
  // exclusions peuvent être dans item.exclusions, ou tag "porc" etc.
  if (!item) return true;
  const ex = exclusions || [];
  if (item.exclusions && item.exclusions.some((e) => ex.includes(e))) return true;
  // tags éventuels
  if (item.tags && item.tags.some((t) => ex.includes(t))) return true;
  // simple: si l'utilisateur exclut "fromage", on évite fromage_blanc / yaourt / skyr via item.exclusions=["fromage"]
  return false;
}

function pickFirstByCategory(items, category, exclusions, alreadyPickedIds) {
  return items.find(
    (it) =>
      it.categorie === category &&
      !hasExcludedTagOrRule(it, exclusions) &&
      !alreadyPickedIds.has(it.id)
  );
}

function generateList(variantId, prefs) {
  const templates = db.variant_templates;
  const foodItems = db.food_items;

  const template = templates.find((t) => t.id === variantId);
  if (!template) throw new Error("Template introuvable");

  const picked = [];
  const pickedIds = new Set();

  for (const slot of template.slots) {
    const choice = pickFirstByCategory(foodItems, slot, prefs.exclusions, pickedIds);
    if (!choice) continue;
    picked.push(choice);
    pickedIds.add(choice.id);
    if (picked.length >= template.max_items) break;
  }

  // total
  const total = picked.reduce((sum, it) => sum + (it.prix_repere || 0), 0);

  // barre équilibre (simple)
  const counts = { proteine: 0, fibre: 0, legume: 0, lipide: 0 };
  for (const it of picked) {
    if (counts[it.categorie] !== undefined) counts[it.categorie] += 1;
  }

  const pillars = db.balance_model.pillars;
  let score = 0;
  // Protéine
  if (counts.proteine >= pillars.proteine.needed) score += pillars.proteine.weight;
  else score += Math.round((counts.proteine / pillars.proteine.needed) * pillars.proteine.weight);
  // Fibre
  if (counts.fibre >= pillars.fibre.needed) score += pillars.fibre.weight;
  else score += Math.round((counts.fibre / pillars.fibre.needed) * pillars.fibre.weight);
  // Légumes
  if (counts.legume >= pillars.legume.needed) score += pillars.legume.weight;
  else score += Math.round((counts.legume / pillars.legume.needed) * pillars.legume.weight);
  // Lipides
  if (counts.lipide >= pillars.lipide.needed) score += pillars.lipide.weight;
  else score += Math.round((counts.lipide / pillars.lipide.needed) * pillars.lipide.weight);

  if (score > 100) score = 100;

  return { items: picked, total, balance: score };
}

/** =========================
 *  SCREENS
 *  ========================= */

function PlansScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Votre Plan Courses</Text>
        <Text style={styles.sub}>Sélectionnez votre style</Text>

        <CardPlan
          accentColor="#2ECC71"
          icon="💸"
          title="ÉCO MALIN"
          price="~38€"
          tags={["PRIX : MINIMAL", "SATIÉTÉ : MAX"]}
          description="Le plein de nutriments, sans toucher à l’épargne."
          examples={["Œufs", "Lentilles", "Carottes"]}
          onPress={() => navigation.navigate("Liste", { variantId: "eco_malin", prefs: userPrefsMVP })}
        />

        <CardPlan
          accentColor="#3498DB"
          icon="🍽️"
          title={"Confort\nQuotidien"}
          price="~45€"
          tags={["VARIÉTÉ : +++", "PLAISIR : VALIDÉ"]}
          description="Cuisinez varié avec des produits frais et gourmands."
          examples={["Poulet", "Colin", "Pâtes", "Poivrons"]}
          onPress={() => navigation.navigate("Liste", { variantId: "confort_quotidien", prefs: userPrefsMVP })}
        />

        <CardPlan
          accentColor="#F39C12"
          icon="⚡"
          title={"Rapide\nPRATIQUE"}
          price="~42€"
          tags={["PRÉPA : < 15 MIN", "EFFORT : MINI"]}
          description="Mangez mieux même quand vos journées débordent."
          examples={["Thon", "Surgelés", "Semoule", "Œufs"]}
          onPress={() => navigation.navigate("Liste", { variantId: "rapide_pratique", prefs: userPrefsMVP })}
        />

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BalanceBar({ value }) {
  return (
    <View style={styles.balanceWrap}>
      <View style={styles.balanceRow}>
        <Text style={styles.balanceTitle}>Barre Équilibre</Text>
        <Text style={styles.balanceValue}>{value}%</Text>
      </View>
      <View style={styles.balanceTrack}>
        <View style={[styles.balanceFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
      </View>
      <Text style={styles.balanceHint}>
        {value >= 100 ? "Équilibre atteint 👍 Tu peux te faire plaisir." : "On complète d’abord l’essentiel, puis plaisir."}
      </Text>
    </View>
  );
}

function ListeScreen({ route }) {
  const { variantId, prefs } = route.params;

  const result = useMemo(() => generateList(variantId, prefs), [variantId, prefs]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Votre Liste</Text>
        <Text style={styles.sub}>
          Variante : {db.variant_templates.find((v) => v.id === variantId)?.nom} • Budget : {prefs.budget}€
        </Text>

        <BalanceBar value={result.balance} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Total estimé</Text>
          <Text style={styles.summaryPrice}>{result.total.toFixed(2)}€</Text>
        </View>

        <View style={{ height: 10 }} />

        {result.items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.nom}</Text>
              <Text style={styles.itemMeta}>
                {it.categorie.toUpperCase()} • {it.unite || "—"} • {it.role}
              </Text>
            </View>
            <Text style={styles.itemPrice}>{(it.prix_repere || 0).toFixed(2)}€</Text>
          </View>
        ))}

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Plans" component={PlansScreen} />
        <Stack.Screen name="Liste" component={ListeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/** =========================
 *  STYLES
 *  ========================= */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 18, paddingBottom: 28 },
  h1: { fontSize: 26, fontWeight: "800", color: "#111" },
  sub: { marginTop: 4, marginBottom: 14, fontSize: 13, color: "#6B7280" },

  card: {
    borderWidth: 2.5,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  cardIcon: { fontSize: 16, marginTop: 2 },
  cardTitle: { fontSize: 22, fontWeight: "900", color: "#111", lineHeight: 24 },
  cardPrice: { fontSize: 18, fontWeight: "800", color: "#111" },

  cardChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  chipText: { fontSize: 11, fontWeight: "800", color: "#111" },

  cardDesc: { marginTop: 10, fontSize: 13, color: "#374151", lineHeight: 18 },
  cardBottomRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cardMiniItem: { fontSize: 11, color: "#6B7280", fontWeight: "700" },

  chooseBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  chooseBtnText: { fontWeight: "900", color: "#111" },

  balanceWrap: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FAFAFA" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  balanceTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  balanceValue: { fontSize: 14, fontWeight: "900", color: "#111" },
  balanceTrack: { height: 12, backgroundColor: "#E5E7EB", borderRadius: 999, overflow: "hidden" },
  balanceFill: { height: 12, backgroundColor: "#111" },
  balanceHint: { marginTop: 8, fontSize: 12, color: "#6B7280" },

  summaryRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryText: { fontSize: 14, fontWeight: "800", color: "#111" },
  summaryPrice: { fontSize: 16, fontWeight: "900", color: "#111" },

  itemRow: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  itemName: { fontSize: 14, fontWeight: "900", color: "#111" },
  itemMeta: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  itemPrice: { fontSize: 13, fontWeight: "900", color: "#111" },
});