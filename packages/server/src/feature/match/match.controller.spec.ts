jest.mock('@scspace-depot/enums/organization.enum', () => ({ OrganizationStatusEnum: {} }), { virtual: true });
jest.mock('./match.prediction.repository', () => ({ MatchPredictionRepository: jest.fn() }));
jest.mock('../auth/jwt/jwt.guard', () => ({ AdminGuard: class {} }));
import { MatchController } from './match.controller';
import { MatchPredictionRepository } from './match.prediction.repository';

const input = { matchId: 1, firstScoreA: 1, firstScoreB: 0, secondScoreA: 2, secondScoreB: 1,
  phoneNumber: '010 1234-5678', privacyConsent: true as const };
const request = { user: { id: 7 } } as any;

describe('match contact API', () => {
  const repo = { insert: jest.fn(), fetchPredictionById: jest.fn(), fetchAllPredictions: jest.fn(), createMatchInfo: jest.fn(), fetchLeaderboard: jest.fn() };
  const controller = new MatchController(repo as unknown as MatchPredictionRepository);
  beforeEach(() => jest.clearAllMocks());
  it('passes normalized contact data to creation', async () => {
    await controller.createPrediction(request, input);
    expect(repo.insert).toHaveBeenCalledWith({ ...input, userId: 7, phoneNumber: '01012345678' });
  });
  it('validates consent even when the API is called directly', async () => {
    jest.spyOn((controller as any).logger, 'error').mockImplementation(() => undefined);
    await expect(controller.createPrediction(request, { ...input, privacyConsent: false } as any)).rejects.toThrow();
    expect(repo.insert).not.toHaveBeenCalled();
  });
  it('omits phone numbers from the public prediction response', async () => {
    repo.fetchAllPredictions.mockResolvedValue([{ id: 9, phoneNumber: '01012345678', correctScoreCount: 2 }]);
    expect(await controller.getAllPredictions()).toEqual({ status: 'success', data: [{ id: 9, correctScoreCount: 2 }] });
    expect((await controller.getAdminPredictions()).data[0].phoneNumber).toBe('01012345678');
  });
  it('returns all leaderboard groups from the repository', async () => {
    const data = { participantCount: 12, groups: [{ positions: [1, 2, 3], predictions: [{ userName: 'Test User' }] }] };
    repo.fetchLeaderboard.mockResolvedValue(data);
    expect(await controller.getLeaderboard(1)).toEqual({ status: 'success', data });
    expect(repo.fetchLeaderboard).toHaveBeenCalledWith(1);
  });
  it('requires a kickoff when creating a match', async () => {
    await expect(controller.createMatchInfo({ matchName: 'Test', teamA: 'A', teamB: 'B' })).rejects.toThrow();
    expect(repo.createMatchInfo).not.toHaveBeenCalled();
  });
});
