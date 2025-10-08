export type SurveyFormData = {
  question: string;
  answers: { value: string }[];
  endDate: string;
  endTime: string;
};
export type SurveyRequestData = {
  title: string;
  endAt: string;
  questionOptions: string[];
};
export type Survey = {
  id: number;
  endAt: string;
  createdAt: string;
  createdBy: {
    avatar: string;
    avatarColor: string;
    fullName: string;
    id: 108;
  };
  isAnswered: boolean;
  title: string;
  status: {
    closed: boolean;
    mySurvey: boolean;
    open: boolean;
  };
  actions: {
    delete: boolean;
  }
};
export type SurveyDetailType = {
  id: number;
  endAt: string;
  createdAt: string;
  createdBy: {
    avatar: string;
    avatarColor: string;
    fullName: string;
    id: number;
  };

  isAnswered: boolean;
  title: string;
  questions: {
    id: number;
    isSelected: boolean;
    order: number;
    selectedUserCount: number;
    text: string;
  }[];
  status: {
    closed: boolean;
    mySurvey: boolean;
    open: boolean;
  };
};
