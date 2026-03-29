/** Одно выпавшее свойство на карте (число — целый процент силы эффекта). */
export type CardTraitRoll = {
  id: string;
  potency: number;
};

export type CardTraitDef = {
  id: string;
  name: string;
  /** Подставляется potency вместо `{p}`. */
  effectTemplate: string;
};
