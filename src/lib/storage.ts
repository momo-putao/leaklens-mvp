"use client";

import { defaultKnowledgeBase } from "./knowledgeBase";
import { DocumentReview, KnowledgeItem } from "./types";

const key = "leaklens.reviews.v1";
const knowledgeKey = "leaklens.knowledge.v1";

export function loadReviews(): DocumentReview[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as DocumentReview[];
  } catch {
    return [];
  }
}

export function saveReviews(reviews: DocumentReview[]) {
  window.localStorage.setItem(key, JSON.stringify(reviews));
}

export function loadKnowledgeBase(): KnowledgeItem[] {
  if (typeof window === "undefined") return defaultKnowledgeBase;
  const raw = window.localStorage.getItem(knowledgeKey);
  if (!raw) return defaultKnowledgeBase;

  try {
    return JSON.parse(raw) as KnowledgeItem[];
  } catch {
    return defaultKnowledgeBase;
  }
}

export function saveKnowledgeBase(items: KnowledgeItem[]) {
  window.localStorage.setItem(knowledgeKey, JSON.stringify(items));
}
