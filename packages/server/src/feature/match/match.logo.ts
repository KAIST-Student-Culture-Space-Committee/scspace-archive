export type MatchLogoFiles = { teamALogo?: Express.Multer.File[]; teamBLogo?: Express.Multer.File[] };

export function logoFilenames(files?: MatchLogoFiles) {
    return { teamALogo: files?.teamALogo?.[0]?.filename, teamBLogo: files?.teamBLogo?.[0]?.filename };
}

export function allLogoFilenames(files?: MatchLogoFiles) {
    return Object.values(logoFilenames(files)).filter((name): name is string => !!name);
}
