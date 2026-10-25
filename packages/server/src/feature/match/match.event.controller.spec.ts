jest.mock('@scspace-depot/types/match', () => ({ MATCH_PRIZE_PLACES: [1, 2, 3], MATCH_AD_MAX: 8 }), { virtual: true });
jest.mock('@scspace-server/tools/file/file.service', () => ({ FileService: class {} }), { virtual: true });
jest.mock('../auth/jwt/jwt.guard', () => ({ AdminGuard: class {} }));
jest.mock('./match.event.interceptor', () => ({ MatchAdInterceptor: class {}, MatchPrizeInterceptor: class {} }));
jest.mock('./match.event.repository', () => ({ MatchEventRepository: jest.fn() }));
import { MatchEventController } from './match.event.controller';
import { MatchEventRepository } from './match.event.repository';
import type { FileService } from '@scspace-server/tools/file/file.service';

const image = { filename: 'new.png' } as Express.Multer.File;

describe('match event assets API', () => {
  const repo = { createAd: jest.fn(), deleteAd: jest.fn(), updatePrize: jest.fn() };
  const fileService = { deletePublicFile: jest.fn() };
  const controller = new MatchEventController(repo as unknown as MatchEventRepository, fileService as unknown as FileService);
  beforeEach(() => jest.clearAllMocks());

  it('requires an image to create a banner', async () => {
    await expect(controller.createAd(undefined)).rejects.toThrow();
    expect(repo.createAd).not.toHaveBeenCalled();
  });
  it('removes the uploaded banner file when saving fails', async () => {
    repo.createAd.mockRejectedValue(new Error('full'));
    await expect(controller.createAd(image)).rejects.toThrow('full');
    expect(fileService.deletePublicFile).toHaveBeenCalledWith('new.png');
  });
  it('deletes the banner image file with its row', async () => {
    repo.deleteAd.mockResolvedValue('old-ad.gif');
    await controller.deleteAd(3);
    expect(fileService.deletePublicFile).toHaveBeenCalledWith('old-ad.gif');
  });
  it('only accepts 1st~3rd prizes and cleans up the upload otherwise', async () => {
    await expect(controller.updatePrize(4, { name: '상품', nameEn: 'Prize' }, image)).rejects.toThrow();
    expect(repo.updatePrize).not.toHaveBeenCalled();
    expect(fileService.deletePublicFile).toHaveBeenCalledWith('new.png');
  });
  it('requires Korean and English prize names', async () => {
    await expect(controller.updatePrize(1, { name: '상품', nameEn: '  ' })).rejects.toThrow();
    expect(repo.updatePrize).not.toHaveBeenCalled();
  });
  it('trims names and deletes the replaced prize image', async () => {
    repo.updatePrize.mockResolvedValue('old-prize.png');
    await controller.updatePrize(2, { name: ' 상품 ', nameEn: ' Prize ' }, image);
    expect(repo.updatePrize).toHaveBeenCalledWith(2, { name: '상품', nameEn: 'Prize', image: 'new.png' });
    expect(fileService.deletePublicFile).toHaveBeenCalledWith('old-prize.png');
    expect(fileService.deletePublicFile).not.toHaveBeenCalledWith('new.png');
  });
});
