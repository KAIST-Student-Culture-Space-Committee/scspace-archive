import {
  PerformanceLotteryInfo,
  PerformanceLottery,
  SeminarLotteryInfo,
  SeminarLottery
} from './lottery';
import { Article } from './article';
import { Organization, OrganizationMember } from './organization';
import { Passpin } from './passpin';
import { Qna } from './qna';
import { Goods, Rental } from './rental';
import { Reservation, ReservationContent, } from './reservation';
import { Rule } from './rule';
import { Space } from './space';
import { User } from './user';
import { MatchInfo, MatchPrediction } from './match';

// 스키마에 정의된 모든 테이블을 모아 내보냅니다.
const schema = {
  Notice: Article,
  Organization,
  OrganizationMember,
  Passpin,
  PerformanceLotteryInfo,
  PerformanceLottery,
  Qna,
  Goods,
  Rental,
  Reservation,
  ReservationContent,
  Rule,
  SeminarLotteryInfo,
  SeminarLottery,
  Space,
  User,
  MatchInfo,
  MatchPrediction,
};

export {
  schema,

  Article as Notice,
  Organization,
  OrganizationMember,
  Passpin,
  PerformanceLotteryInfo,
  PerformanceLottery,
  Qna,
  Goods,
  Rental,
  Reservation,
  ReservationContent,
  Rule,
  Space,
  SeminarLotteryInfo,
  SeminarLottery,
  User,
  MatchInfo,
  MatchPrediction,
};