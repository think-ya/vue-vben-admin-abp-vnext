import { useMessage } from '/@/hooks/web/useMessage';
import { useI18n } from '/@/hooks/web/useI18n';
// import router from '/@/router';
// import { PageEnum } from '/@/enums/pageEnum';
import { useUserStoreWidthOut } from '/@/store/modules/user';

const { createMessage } = useMessage();

const error = createMessage.error!;
export function checkStatus(status: number, msg: string): void {
  const { t } = useI18n();
  const userStore = useUserStoreWidthOut();
  switch (status) {
    case 400:
      error(`${msg}`);
      break;
    // 401: Not logged in
    // Jump to the login page if not logged in, and carry the path of the current page
    // Return to the current page after successful login. This step needs to be operated on the login page.
    case 401:
      error(t('sys.api.errMsg401'));
      userStore.setToken(undefined);
      userStore.setSessionTimeout(true);
      break;
    case 403:
      error(t('sys.api.errMsg403'));
      break;
    // 404请求不存在
    case 404:
      error(t('sys.api.errMsg404'));
      break;
    case 405:
      error(t('sys.api.errMsg405'));
      break;
    case 408:
      error(t('sys.api.errMsg408'));
      break;
    case 500:
      error(t('sys.api.errMsg500'));
      break;
    case 501:
      error(t('sys.api.errMsg501'));
      break;
    case 502:
      error(t('sys.api.errMsg502'));
      break;
    case 503:
      error(t('sys.api.errMsg503'));
      break;
    case 504:
      error(t('sys.api.errMsg504'));
      break;
    case 505:
      error(t('sys.api.errMsg505'));
      break;
    default:
  }
}

export function checkResponse(response: any): void {
  if (response.data && response.data.error) {
    if (response.data.error_description) {
      error(response.data.error_description);
    } else if (response.data.error.details) {
      error(response.data.error.details);
    } else if (response.data.error.message) {
      error(response.data.error.message);
    }
  } else {
    const { t } = useI18n();
    checkStatus(response.status, t('sys.api.apiRequestFailed'));
  }
}
