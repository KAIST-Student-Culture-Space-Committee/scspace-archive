import { OrganizationStatusEnum } from "./organization.enum";


const DEFAULT_EMOJI_RESERVATION = '📅'     //reservation icon
const DEFAULT_EMOJI_FAIL = '❌'     //fail icon

export const OrgStatusMeta = {
    [OrganizationStatusEnum.REGISTER_REQUEST]: {
        color: '#17a2b8',
        emoji: '⏳',
        header: {
            kr: '조직 등록 요청 접수',
            en: 'Organization registration request received'
        },
        body: {
            kr: '조직 등록 요청이 접수되었습니다. 관리자의 승인을 기다려 주세요.',
            en: 'Your organization registration request has been received. Please wait for approval.'
        },

        benefits: [],
    },

    [OrganizationStatusEnum.REGISTERED]: {
        color: '#007bff',
        emoji: '📝',
        header: {
            kr: '조직 등록 완료',
            en: 'Organization registered'
        },
        body: {
            kr: '조직 등록이 완료되었습니다.',
            en: 'Organization registration is complete.'
        },
        benefits: [
            {
                kr: '공간 예약 신청이 가능합니다.',
                en: 'You can apply for spaces reservations.'
            }
        ],
    },

    [OrganizationStatusEnum.VERIFY_REQUEST]: {
        color: '#c99700ff',
        emoji: '🔍',
        header: {
            kr: '조직 인증 심사 중',
            en: 'Organization verification in progress'
        },
        body: {
            kr: '조직 인증을 위해 검토 중입니다. 심사 완료까지 기다려 주세요.',
            en: 'We are reviewing the organization you registered verification. Please wait for the review to complete.'
        },
        benefits: [],
    },

    [OrganizationStatusEnum.VERIFIED]: {
        color: '#28a745',
        emoji: '🎉',
        header: {
            kr: '조직 인증 승인 완료',
            en: 'Organization verification approved'
        },
        body: {
            kr: '축하합니다! 조직 인증이 승인되었습니다.',
            en: 'Congratulations! Your organization verification has been approved.'
        },
        benefits: [
            {
                kr: '세미나실 정기예약을 신청할 수 있습니다.',
                en: 'You can apply for recurring seminar room reservations.'
            },
            {
                kr: '공연집중기간 추첨에 참여할 수 있습니다.',
                en: 'You can participate in the Performance-Intensive lottery.'
            }
        ],
    },

    [OrganizationStatusEnum.REJECTED]: {
        color: '#dc3545',
        emoji: DEFAULT_EMOJI_FAIL,
        header: {
            kr: '조직 인증이 반려되었습니다',
            en: 'Organization verification rejected'
        },
        body: {
            kr: '자세한 사유는 이메일로 문의해 주세요.',
            en: 'Please contact by the email for detailed reasons.'
        },
        benefits: [],
    },
} as const;


export const ReservationMeta = {
    ReservationCompleted: {
        color: '#4CAF50',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header: {
            kr: "예약 완료 안내",
            en: "Reservation Confirmed"
        },
        body: {
            kr: "귀하의 예약이 아래와 같이 정상적으로 처리되었습니다. ",
            en: "Your reservation request has been processed successfully. "
        },
        contentUpperDesc: {
            kr: "신규 예약",
            en: "New Reservation"
        }

    },

    ReservationDeleted: {
        color : '#eb4034',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header : {
            kr: "예약 취소 안내",
            en: "Reservation Cancelled"
        },
        body: {
            kr: "귀하의 예약이 정상적으로 삭제되었습니다. ",
            en: "Your reservation has been deleted successfully. "
        },
        contentUpperDesc: {
            kr: "예약 취소",
            en: "Reservation Cancellation"
        }
    },
    ReservationUpdated: {
        color : '#34b4eb',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header : {
            kr: "예약 수정 완료 안내",
            en: "Reservation Updated"
        },
        body: {
            kr: "귀하의 예약이 정상적으로 변경되었습니다. ",
            en: "Your reservation has been updated successfully. "
        },
        contentUpperDesc: {
            kr: "예약 수정",
            en: "Reservation Modification"
        }
    },
    MultipleReservationCompleted: {
        color: '#4CAF50',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header: {
            kr: "다중 예약 처리 결과 안내",
            en: "Multi-Reservation Results"
        },
        body: {
            kr: "귀하의 다중예약 요청 처리 결과를 아래와 같이 안내드립니다.",
            en: "Your multi-reservation request results are as follows."
        },
        contentUpperDesc: {
            kr: "신규 다중 예약",
            en: "New Multi-Reservation"
        },
        templateFooter : "이 메일은 다중예약 해당 조직의 위임자 (Delegator) 에게 발송되었습니다.",
        templateFooterEn : "This email is sent to the Delegator of the multi-reservation organization.",
    },
    WorkerNotif : {
        color: '#c5a535',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header: {
            kr: "근로 요청 예약 안내",
            en: "New Work-Request Reservation"
        },
        body: {
            kr: "새로운 근로 요청 예약이 생성되었습니다.",
            en: "New work-request reservation just created. "
        },
        contentUpperDesc: {
            kr: "신규 근로 요청",
            en: "New Work-Request"
        },
        templateFooter : "이 메일은 근로자로 등록되어 있는 모든 사용자에게 발송되었습니다. ",
        templateFooterEn : "This email is sent to all users who have registered as workers. ",

    }
} as const


export const LotteryMeta = {
    Seminar : {
        Win : {
            type : 'seminar', // discriminator for seminar from performance - in template
            // color : "#24d7c2",
            color : "#007bff",
            emoji : '🎉',
            header : {
                kr : "세미나실 예약 추첨 결과 안내",
                en : "Seminar Room Reservation Lottery Results",
            },
            body :  {
                kr : "귀 조직의 세미나실 정기예약 신청의 추첨 결과를 아래와 같이 안내드립니다.",
                en : "The results of the lottery for the seminar room reservation of your organization are as follows.",
            },
            contentUpperDesc : {
                kr : "예약 성공 (당첨)",
                en : "Reservation Successful",
            },
            templatefooter :  "이 메일은 정기예약 추첨 신청 조직의 위임자 (Delegator) 에게 발송되었습니다.",
            templatefooterEn : "This email is sent to the Delegator of the reservation lottery organization.",
        },
        Lost : {
            type : 'seminar',
            color : "#d72424",
            emoji : DEFAULT_EMOJI_RESERVATION,
            header : {
                kr : "세미나실 예약 추첨 결과 안내",
                en : "Seminar Room Reservation Lottery Results",
            },
            body :  {
                kr : "귀 조직의 세미나실 정기예약 신청의 추첨 결과를 아래와 같이 안내드립니다.",
                en : "The results of the lottery for the seminar room reservation of your organization are as follows.",
            },
            contentUpperDesc : {
                kr : "예약 실패 (낙첨)",
                en : "Reservation Failed",
            },
            templatefooter :  "이 메일은 정기예약 추첨 신청 조직의 위임자 (Delegator) 에게 발송되었습니다.",
            templatefooterEn : "This email is sent to the Delegator of the reservation lottery organization.",
        }
    },
    Performance : {
        Win : {
            type : 'performance',
            // color : "#24d7c2",
            color : "#007bff",
            emoji : '🎉' ,
            header : {
                kr : "공연집중기간 예약 추첨 결과 안내",
                en : "Performance Concentration Period Reservation Results",
            },
            body :  {
                kr : "귀 조직의 공연집중기간 예약 신청의 추첨 결과를 아래와 같이 안내드립니다.",
                en : "The results of the lottery for the performance concentration period reservation of your organization are as follows.",
            },
            contentUpperDesc : {
                kr : "예약 성공 (당첨)",
                en : "Reservation Successful",
            },
            templatefooter :  "이 메일은 공연집중기간 예약 추첨 신청 조직의 위임자 (Delegator) 에게 발송되었습니다.",
            templatefooterEn : "This email is sent to the Delegator of the reservation lottery organization.",
        },
        Lost : {
            type : 'performance',
            color : "#d72424",
            emoji : DEFAULT_EMOJI_RESERVATION,
            header : {
                kr : "공연집중기간 예약 추첨 결과 안내",
                en : "Performance Concentration Period Reservation Results",
            },
            body :  {
                kr : "귀 조직의 공연집중기간 예약 신청의 추첨 결과를 아래와 같이 안내드립니다.",
                en : "The results of the lottery for the performance concentration period reservation of your organization are as follows.",
            },
            contentUpperDesc : {
                kr : "예약 실패 (낙첨)",
                en : "Reservation Failed",
            },
            templatefooter :  "이 메일은 공연집중기간 예약 추첨 신청 조직의 위임자 (Delegator) 에게 발송되었습니다.",
            templatefooterEn : "This email is sent to the Delegator of the reservation lottery organization.",
        }
    }
} as const

export const WorkerMeta  = {
    forWorker : {
        color: '#8d71b6',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header: {
            kr: "근로 할당 확정 안내",
            en: "Work Assigned Confirmation"
        },
        body: {
            kr: "귀하가 신청하신 근로 배정이 정상적으로 처리되었습니다.",
            en: "New work has been assigned to you."
        },
        templatefooter :  "예약자에게 귀하(근로장학생)의 성명과 이메일이 공유되었습니다.",
        templatefooterEn : "Your name and email has been shared with the author of reservation assigned to you.",
    },
    forAuthor : {
        color: '#8d71b6',
        emoji: DEFAULT_EMOJI_RESERVATION,
        header: {
            kr: "근로자 배정 안내",
            en: "Worker Assigned Confirmation"
        },
        body: {
            kr: "귀하의 예약에 근로자가 배정되었습니다.",
            en: "Work has been assigned to your reservation."
        },
        templatefooter :  "이 메일은 '근로자'를 요청한 예약의 예약자에게 발송되었습니다. 귀하의 예약 정보가 근로자에게 전달되었습니다. ",
        templatefooterEn : "This mail is sent to the author of the reservation that requested 'worker'. Your reservation information has been sent to the assigned worker. ",
    }
} as const


export const RentalMeta = {
    createdSuccess: {
        color: '#2f855a',
        emoji: '📦',
        header: {
            kr: '대여 신청 등록 안내',
            en: 'Rental Registration Confirmed'
        },
        body: {
            kr: '대여 신청이 정상적으로 등록되었습니다. 아래의 핵심 정보를 확인해 주세요.',
            en: 'Your rental registration has been completed successfully. Please review the key details below.'
        },
        templateFooter: '대여 관련 변경이나 문의가 필요하시면 학생문화공간위원회로 연락해 주세요.',
        templateFooterEn: 'If you need to change or ask about this rental, please contact the Student Cultural Space Committee.',
    },
    requestReturn: {
        color: '#d72424',
        emoji: DEFAULT_EMOJI_FAIL,
        header: {
        kr: "대여 반납 기한 경과 안내 및 반납 요청",
        en: "Rental Return Due Expired"
        },
        body: {
            kr: "귀하의 대여 반납 기한이 경과하였음을 알려드립니다. 빠른 시일 내 반납 완료 절차를 진행해주시기를 요청드리며, 그렇지 않을 경우 불이익이 있을 수 있습니다. ",
            en: "Your rental return due has expired. Please complete the process of returning the rental as soon as possible. If you do not complete the process of returning the rental, there may be a disadvantage. "
        },
        templateFooter : "이 메일은 반납기한을 초과한 대여에 대하여 일괄 발송되었습니다. ",
        templateFooterEn : "This mail is sent to all rental authors that have exceeded the return due. ",
    }
} as const


export const PenaltyMeta = {
    Imposed: {
        color: '#d9480f',
        emoji: '⚠️',
        header: {
            kr: '페널티 부과 안내',
            en: 'Penalty Notice'
        },
        body: {
            kr: '귀하(또는 소속 조직)에게 주의/경고가 부과되었음을 안내드립니다. 자세한 내용은 아래를 확인해 주세요.',
            en: 'This is to inform you that a notice/warning has been issued to you (or your organization). Please check the details below.'
        },
        templateFooter: '이 메일은 페널티가 부과된 개인 또는 조직의 이메일로 발송되었습니다.',
        templateFooterEn: 'This mail is sent to the individual or organization the penalty was imposed on.',
    },
    Cancelled: {
        color: '#28a745',
        emoji: '✅',
        header: {
            kr: '페널티 취소 안내',
            en: 'Penalty Cancelled'
        },
        body: {
            kr: '페널티 이력이 삭제되어 안내드립니다. 자세한 내용은 아래를 확인해 주세요.',
            en: 'This is to inform you that a penalty record has been deleted. Please check the details below.'
        },
        templateFooter: '이 메일은 페널티 이력이 삭제된 개인 또는 조직의 이메일로 발송되었습니다.',
        templateFooterEn: 'This mail is sent to the individual or organization whose penalty history was deleted.',
    }
} as const
