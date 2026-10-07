import { IUser } from "../user";
import { IGoods } from "./goods.type";
import { IOrganization } from "../organization";

// Table: rental
export interface IRental {
    id: number;
    userId: number;
    organizationId : number; //new
    rentalWorkerId : number; //new
    returnWorkerId : number; //new
    goodsId: number;
    count: number;
    phoneNumber: string;
    emergencyContactPresident: string;
    emergencyContactVicePresident: string;
    reasonLocation: string;
    reasonPurpose: string;
    timeBorrow: number;
    timeDue: number;
    timeReturn: number;
    certName: string;
    status : number; //new
    //timeConfirmed << deleted
}

export type IRentalAll = IRental & {
    user: IUser;
    organization : IOrganization;
    goods: IGoods;
};

//rentalWorkerId => req.user.id, userId should be designated
export type IRentalCreate = Pick<
    IRental,
    "userId" | "organizationId" | "rentalWorkerId" | "goodsId" | "count" | "phoneNumber" | "emergencyContactPresident" | "emergencyContactVicePresident" | "reasonLocation" | "reasonPurpose" | "timeBorrow" | "timeDue"
>;

//the rentalWorkerId => req.user.id, then we should throw a userId / organizationId (indiv => 1)
export type IRentalCreateClient = Pick<
    IRentalCreate,
    "userId" | "organizationId" | "goodsId" | "count" | "phoneNumber" | "emergencyContactPresident" | "emergencyContactVicePresident" | "reasonLocation" | "reasonPurpose" | "timeDue"
>;

export type IRentalUpdate = Partial<Pick<
    IRental,
    "goodsId" | "count" | "timeDue" | "timeReturn" | "returnWorkerId" | "status"
>> & {
    id: number;
};

// 대여 가능 여부 체크 - i dont know
export type IGoodsAvailabilityCheck = {
    goodsId: number;
    count: number;
};

//**수정 필요**
// 사용자 대여 현황 조회
export type IUserRentalStatus = {
    userId: number;
    onlyIndividual : boolean;
    isActive?: boolean; // true면 현재 대여중인 것만, false면 모든 대여 기록
};
