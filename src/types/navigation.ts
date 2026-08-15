import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Tenant: undefined;
  Login: undefined;
  Register: undefined;
  SetPin: undefined;
  Setup: undefined;
  SetupFace: { returnTo?: 'setup' | 'enroll' } | undefined;
  Sso: { token?: string; tenant?: string } | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Clock: { type?: 'in' | 'out'; force?: boolean } | undefined;
  Attendance: undefined;
  Calendar: undefined;
  Profile: undefined;
};

export type SubStackParamList = {
  LeaveRequest: undefined;
  OvertimeRequest: undefined;
  Calendar: undefined;
  Visit: undefined;
  VisitList: undefined;
  TaskList: undefined;
  TaskDetail: { taskId: number };
  AnnouncementList: undefined;
  AnnouncementDetail: { announcementId: number };
  ProfileDetail: undefined;
  DocumentViewer: { uri: string; title?: string };
  FaceEnroll: undefined;
  PinChange: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  SubNavigator: NavigatorScreenParams<SubStackParamList> | undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
