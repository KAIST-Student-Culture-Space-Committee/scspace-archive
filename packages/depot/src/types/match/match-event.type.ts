export interface IMatchAd {
    id: number;
    // Uploaded image filename (GIF allowed).
    image: string;
}

export interface IMatchPrize {
    place: number;
    name: string;
    nameEn: string;
    // Uploaded image filename; null until an image is uploaded.
    image: string | null;
}

export const MATCH_AD_MAX = 8;
export const MATCH_PRIZE_PLACES = [1, 2, 3] as const;
