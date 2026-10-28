/**
 * Local perfume database — 30 popular perfumes
 * Used for client-side search and recommendation
 * No Fragella API dependency
 */

import type { Perfume } from "@/lib/algorithm";

export const perfumes: Perfume[] = [
  {
    id: "1",
    name: "Light Blue",
    brand: "Dolce & Gabbana",
    accords: [
      { name: "Cítrico", value: 90 },
      { name: "Fresco", value: 85 },
      { name: "Floral", value: 40 },
      { name: "Frutado", value: 35 },
    ],
  },
  {
    id: "2",
    name: "J'adore",
    brand: "Dior",
    accords: [
      { name: "Floral", value: 95 },
      { name: "Frutado", value: 50 },
      { name: "Doce", value: 40 },
      { name: "Musk", value: 30 },
    ],
  },
  {
    id: "3",
    name: "Libre",
    brand: "Yves Saint Laurent",
    accords: [
      { name: "Floral", value: 70 },
      { name: "Lavanda", value: 65 },
      { name: "Quente", value: 50 },
      { name: "Aromático", value: 45 },
    ],
  },
  {
    id: "4",
    name: "Good Girl",
    brand: "Carolina Herrera",
    accords: [
      { name: "Oriental", value: 80 },
      { name: "Doce", value: 70 },
      { name: "Floral", value: 45 },
      { name: "Gourmand", value: 40 },
    ],
  },
  {
    id: "5",
    name: "Coco Mademoiselle",
    brand: "Chanel",
    accords: [
      { name: "Cítrico", value: 65 },
      { name: "Floral", value: 60 },
      { name: "Oriental", value: 50 },
      { name: "Fresco", value: 40 },
    ],
  },
  {
    id: "6",
    name: "La Vie Est Belle",
    brand: "Lancôme",
    accords: [
      { name: "Doce", value: 85 },
      { name: "Gourmand", value: 80 },
      { name: "Floral", value: 55 },
      { name: "Baunilha", value: 50 },
    ],
  },
  {
    id: "7",
    name: "Flowerbomb",
    brand: "Viktor & Rolf",
    accords: [
      { name: "Floral", value: 90 },
      { name: "Doce", value: 75 },
      { name: "Oriental", value: 45 },
      { name: "Powdery", value: 35 },
    ],
  },
  {
    id: "8",
    name: "Black Opium",
    brand: "Yves Saint Laurent",
    accords: [
      { name: "Gourmand", value: 85 },
      { name: "Doce", value: 80 },
      { name: "Baunilha", value: 70 },
      { name: "Oriental", value: 55 },
    ],
  },
  {
    id: "9",
    name: "Chance Eau Tendre",
    brand: "Chanel",
    accords: [
      { name: "Floral", value: 80 },
      { name: "Fresco", value: 65 },
      { name: "Frutado", value: 50 },
      { name: "Musk", value: 40 },
    ],
  },
  {
    id: "10",
    name: "Miss Dior",
    brand: "Dior",
    accords: [
      { name: "Floral", value: 85 },
      { name: "Rosa", value: 75 },
      { name: "Fresco", value: 45 },
      { name: "Powdery", value: 35 },
    ],
  },
  {
    id: "11",
    name: "Acqua di Gioia",
    brand: "Giorgio Armani",
    accords: [
      { name: "Aquático", value: 85 },
      { name: "Fresco", value: 80 },
      { name: "Cítrico", value: 55 },
      { name: "Floral", value: 35 },
    ],
  },
  {
    id: "12",
    name: "Shalimar",
    brand: "Guerlain",
    accords: [
      { name: "Oriental", value: 90 },
      { name: "Âmbar", value: 80 },
      { name: "Baunilha", value: 70 },
      { name: "Powdery", value: 45 },
    ],
  },
  {
    id: "13",
    name: "Daisy",
    brand: "Marc Jacobs",
    accords: [
      { name: "Floral", value: 80 },
      { name: "Fresco", value: 65 },
      { name: "Verde", value: 50 },
      { name: "Frutado", value: 40 },
    ],
  },
  {
    id: "14",
    name: "Gabrielle",
    brand: "Chanel",
    accords: [
      { name: "Floral", value: 90 },
      { name: "Jasmim", value: 70 },
      { name: "Fresco", value: 45 },
      { name: "Musk", value: 30 },
    ],
  },
  {
    id: "15",
    name: "Mon Paris",
    brand: "Yves Saint Laurent",
    accords: [
      { name: "Floral", value: 75 },
      { name: "Frutado", value: 70 },
      { name: "Doce", value: 60 },
      { name: "Rosa", value: 55 },
    ],
  },
  {
    id: "16",
    name: "Sauvage",
    brand: "Dior",
    accords: [
      { name: "Aromático", value: 80 },
      { name: "Fresco", value: 70 },
      { name: "Especiado", value: 55 },
      { name: "Amadeirado", value: 50 },
    ],
  },
  {
    id: "17",
    name: "Bleu de Chanel",
    brand: "Chanel",
    accords: [
      { name: "Amadeirado", value: 75 },
      { name: "Aromático", value: 65 },
      { name: "Cítrico", value: 55 },
      { name: "Fresco", value: 50 },
    ],
  },
  {
    id: "18",
    name: "Ombré Nomade",
    brand: "Louis Vuitton",
    accords: [
      { name: "Oud", value: 90 },
      { name: "Amadeirado", value: 80 },
      { name: "Resinoso", value: 60 },
      { name: "Oriental", value: 55 },
    ],
  },
  {
    id: "19",
    name: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    accords: [
      { name: "Âmbar", value: 85 },
      { name: "Doce", value: 75 },
      { name: "Amadeirado", value: 55 },
      { name: "Musk", value: 40 },
    ],
  },
  {
    id: "20",
    name: "Delina",
    brand: "Parfums de Marly",
    accords: [
      { name: "Floral", value: 85 },
      { name: "Rosa", value: 80 },
      { name: "Frutado", value: 55 },
      { name: "Doce", value: 50 },
    ],
  },
  {
    id: "21",
    name: "Tobacco Vanille",
    brand: "Tom Ford",
    accords: [
      { name: "Doce", value: 80 },
      { name: "Baunilha", value: 75 },
      { name: "Quente", value: 70 },
      { name: "Especiado", value: 60 },
    ],
  },
  {
    id: "22",
    name: "Si",
    brand: "Giorgio Armani",
    accords: [
      { name: "Doce", value: 70 },
      { name: "Frutado", value: 65 },
      { name: "Floral", value: 55 },
      { name: "Musk", value: 40 },
    ],
  },
  {
    id: "23",
    name: "Alien",
    brand: "Mugler",
    accords: [
      { name: "Amadeirado", value: 75 },
      { name: "Oriental", value: 70 },
      { name: "Âmbar", value: 65 },
      { name: "Floral", value: 45 },
    ],
  },
  {
    id: "24",
    name: "Hypnotic Poison",
    brand: "Dior",
    accords: [
      { name: "Oriental", value: 85 },
      { name: "Doce", value: 75 },
      { name: "Gourmand", value: 65 },
      { name: "Baunilha", value: 60 },
    ],
  },
  {
    id: "25",
    name: "Narciso Rodriguez For Her",
    brand: "Narciso Rodriguez",
    accords: [
      { name: "Musk", value: 90 },
      { name: "Floral", value: 50 },
      { name: "Powdery", value: 45 },
      { name: "Amadeirado", value: 35 },
    ],
  },
  {
    id: "26",
    name: "212 VIP",
    brand: "Carolina Herrera",
    accords: [
      { name: "Floral", value: 65 },
      { name: "Frutado", value: 60 },
      { name: "Musk", value: 50 },
      { name: "Doce", value: 45 },
    ],
  },
  {
    id: "27",
    name: "Oud Wood",
    brand: "Tom Ford",
    accords: [
      { name: "Oud", value: 85 },
      { name: "Amadeirado", value: 80 },
      { name: "Especiado", value: 45 },
      { name: "Resinoso", value: 40 },
    ],
  },
  {
    id: "28",
    name: "Aventus",
    brand: "Creed",
    accords: [
      { name: "Frutado", value: 75 },
      { name: "Amadeirado", value: 65 },
      { name: "Fresco", value: 55 },
      { name: "Defumado", value: 45 },
    ],
  },
  {
    id: "29",
    name: "Chloé",
    brand: "Chloé",
    accords: [
      { name: "Floral", value: 85 },
      { name: "Powdery", value: 70 },
      { name: "Rosa", value: 65 },
      { name: "Fresco", value: 40 },
    ],
  },
  {
    id: "30",
    name: "The One",
    brand: "Dolce & Gabbana",
    accords: [
      { name: "Floral", value: 70 },
      { name: "Oriental", value: 65 },
      { name: "Doce", value: 55 },
      { name: "Amadeirado", value: 40 },
    ],
  },
];
