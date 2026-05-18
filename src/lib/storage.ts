"use client";

import { DocumentReview } from "./types";

const key = "leaklens.reviews.v1";

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
