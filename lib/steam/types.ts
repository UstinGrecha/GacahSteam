export type SteamPriceOverview = {
  final?: number;
  currency?: string;
};

export type SteamReleaseDate = {
  coming_soon?: boolean;
  date?: string;
};

export type SteamRecommendations = {
  /** Steam иногда отдаёт строкой; нормализуем в parse. */
  total?: number | string;
};

export type SteamMetacritic = {
  score?: number;
};

export type SteamGenre = {
  id?: string;
  description?: string;
};

export type SteamCategory = {
  id?: number;
  description?: string;
};

export type SteamAppDetailsData = {
  type?: string;
  name?: string;
  is_free?: boolean;
  short_description?: string;
  header_image?: string;
  reviews?: string;
  review_score?: number;
  review_score_desc?: string;
  metacritic?: SteamMetacritic;
  price_overview?: SteamPriceOverview;
  release_date?: SteamReleaseDate;
  recommendations?: SteamRecommendations;
  genres?: SteamGenre[];
  categories?: SteamCategory[];
};

export type SteamAppDetailsEntry = {
  success: boolean;
  data?: SteamAppDetailsData;
};

export type SteamAppDetailsResponse = Record<
  string,
  SteamAppDetailsEntry | undefined
>;
