/*
 * Faction data registry
 *
 * The three containers that every faction folder fills in: ENCY (army lists), UPG (character upgrades)
 * and FGLOSS (faction rule text). Each faction has its own folder next to this file with one file per
 * container.
 *
 * In this file: ENCY, UPG, FGLOSS
 */

/* Army lists: one entry per faction, pushed by data/factions/<faction>/units.js in load order. */
const ENCY = [];

/* Character upgrades per faction name, set by data/factions/<faction>/upgrades.js. */
const UPG = {};

/* Faction rule text per faction name, set by data/factions/<faction>/rules-text.js. */
const FGLOSS = {};
