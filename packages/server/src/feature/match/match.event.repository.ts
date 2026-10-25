import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DBAsyncProvider } from 'src/db/db.provider';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { schema, MatchAd, MatchPrize } from '@schema';
import { asc, count, eq } from 'drizzle-orm';
import { MATCH_AD_MAX } from '@scspace-depot/types/match';

@Injectable()
export class MatchEventRepository {
  constructor(
    @Inject(DBAsyncProvider) private readonly db: MySql2Database<typeof schema>,
  ) {}

  fetchAds() {
    return this.db.select({ id: MatchAd.id, image: MatchAd.image }).from(MatchAd).orderBy(asc(MatchAd.id));
  }

  async createAd(image: string) {
    return this.db.transaction(async (tx) => {
      const [{ total }] = await tx.select({ total: count() }).from(MatchAd);
      if (total >= MATCH_AD_MAX) {
        throw new BadRequestException(`배너는 최대 ${MATCH_AD_MAX}개까지 등록할 수 있습니다.`);
      }
      const [result] = await tx.insert(MatchAd).values({ image });
      return result.insertId;
    });
  }

  /** Deletes the banner row and returns its image filename so the caller can delete the file. */
  async deleteAd(id: number) {
    return this.db.transaction(async (tx) => {
      const [ad] = await tx.select().from(MatchAd).where(eq(MatchAd.id, id)).for('update');
      if (!ad) throw new NotFoundException(`배너 ID ${id}를 찾을 수 없습니다.`);
      await tx.delete(MatchAd).where(eq(MatchAd.id, id));
      return ad.image;
    });
  }

  fetchPrizes() {
    return this.db.select().from(MatchPrize).orderBy(asc(MatchPrize.place));
  }

  /** Upserts a prize and returns the image filename it replaced (if any), so the caller can delete the file. */
  async updatePrize(place: number, data: { name: string; nameEn: string; image?: string }) {
    return this.db.transaction(async (tx) => {
      const [prize] = await tx.select().from(MatchPrize).where(eq(MatchPrize.place, place)).for('update');
      if (!prize) {
        await tx.insert(MatchPrize).values({ place, name: data.name, nameEn: data.nameEn, image: data.image ?? null });
        return null;
      }
      await tx.update(MatchPrize).set(data).where(eq(MatchPrize.place, place));
      return data.image ? prize.image : null;
    });
  }
}
