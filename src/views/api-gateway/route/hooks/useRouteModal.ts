import type { Ref } from 'vue';

import { computed, reactive, ref, unref, watchEffect } from 'vue';
import { useI18n } from '/@/hooks/web/useI18n';
import { HostAndPort, HttpMethods } from '/@/api/api-gateway/model/basicModel';
import { create, update, getById } from '/@/api/api-gateway/route';
import { CreateRoute, UpdateRoute } from '/@/api/api-gateway/model/routeModel';
import { getActivedList } from '/@/api/api-gateway/group';
import { getLoadBalancerProviders } from '/@/api/api-gateway/basic';
import { ReturnInnerMethods } from '/@/components/Modal';
import { isIpPort, isSortUrl } from '/@/utils/is';

interface UseRouteModal {
  emit: EmitType;
  formElRef: Ref<any | null>;
  routeIdRef: Ref<string>;
  modalMethods: ReturnInnerMethods;
}

export function useRouteModal({ emit, formElRef, routeIdRef, modalMethods }: UseRouteModal) {
  const { t } = useI18n();
  const routeRef = ref<Recordable>({});
  const appIdOptions = ref<any>([]);
  const balancerOptions = ref<any>([]);

  watchEffect(() => {
    initRoute();
    !unref(routeIdRef) && fetchOptions();
    unref(routeIdRef) && fetchRoute();
  });

  function initRoute() {
    // 嵌套对象初始化一下
    routeRef.value = {
      timeout: 10000,
      priority: 0,
      downstreamScheme: 'HTTP',
      reRouteIsCaseSensitive: true,
      dangerousAcceptAnyServerCertificateValidator: true,
      qoSOptions: {
        timeoutValue: 10000,
        durationOfBreak: 60000,
        exceptionsAllowedBeforeBreaking: 50,
      },
      securityOptions: {},
      rateLimitOptions: {},
      fileCacheOptions: {},
      httpHandlerOptions: {
        useProxyuseProxy: false,
        useTracing: false,
        allowAutoRedirect: false,
        useCookieContainer: false,
      },
      loadBalancerOptions: {},
      authenticationOptions: {},
    };
  }

  function fetchOptions() {
    getActivedList().then((res) => {
      appIdOptions.value = res.items.map((item) => {
        return {
          label: item.appName,
          value: item.appId,
        };
      });
    });
    getLoadBalancerProviders().then((res) => {
      balancerOptions.value = res.items.map((item) => {
        return {
          label: item.displayName,
          value: item.type,
        };
      });
    });
  }

  function fetchRoute() {
    getById(unref(routeIdRef)).then((res) => {
      routeRef.value = res;
    });
  }

  const httpMethods = Object.keys(HttpMethods).map((key) => {
    return {
      key: key,
      label: key,
      value: key,
    };
  });

  const radioOptions = reactive([
    { label: t('ApiGateway.DisplayName:Enable'), value: true },
    { label: t('ApiGateway.DisplayName:Disable'), value: false },
  ]);

  const formTitle = computed(() => {
    const route = unref(routeRef);
    if (route.reRouteId) {
      return t('ApiGateway.Route:EditBy', [route.reRouteName]);
    }
    return t('ApiGateway.Route:AddNew');
  });

  function validatePathTemplate(_, value: string) {
    if (!String(value).startsWith('/')) {
      return Promise.reject(t('ApiGateway.RequestAddressMustStartWithBackslashSymbol'));
    }
    return Promise.resolve();
  }

  function validateDownstreamHostAndPort(_, value: HostAndPort[]) {
    if (!value || value.length === 0) {
      return Promise.reject(
        t('AbpValidation.The {0} field is required', [
          t('ApiGateway.DisplayName:DownstreamHostAndPorts'),
        ]),
      );
    }
    for (let index = 0; index < value.length; index++) {
      const url = `${value[index].host}:${value[index].port}`;
      if (!isIpPort(url) && !isSortUrl(url)) {
        return Promise.reject(t('AbpValidation.The field {0} is invalid', [url]));
      }
    }
    return Promise.resolve();
  }

  const formRules = reactive({
    appId: [
      {
        required: true,
        message: t('AbpValidation.The {0} field is required', [t('ApiGateway.DisplayName:AppId')]),
      },
    ],
    reRouteName: [
      {
        required: true,
        message: t('AbpValidation.The {0} field is required', [t('ApiGateway.DisplayName:Name')]),
      },
    ],
    upstreamHttpMethod: [
      {
        required: true,
        message: t('AbpValidation.The {0} field is required', [
          t('ApiGateway.DisplayName:UpstreamHttpMethod'),
        ]),
      },
    ],
    downstreamHostAndPorts: [
      {
        required: true,
        trigger: 'blur',
        validator: validateDownstreamHostAndPort,
      },
    ],
    upstreamPathTemplate: [
      {
        required: true,
        message: t('AbpValidation.The {0} field is required', [
          t('ApiGateway.DisplayName:UpstreamPathTemplate'),
        ]),
      },
      {
        trigger: 'change',
        validator: validatePathTemplate,
      },
    ],
    downstreamPathTemplate: [
      {
        required: true,
        message: t('AbpValidation.The {0} field is required', [
          t('ApiGateway.DisplayName:DownstreamPathTemplate'),
        ]),
      },
      {
        trigger: 'change',
        validator: validatePathTemplate,
      },
    ],
  });

  const getHostAndPorts = computed(() => {
    const route = unref(routeRef);
    return route.downstreamHostAndPorts
      ? route.downstreamHostAndPorts.map((m: HostAndPort) => {
          return `${m.host}:${m.port}`;
        })
      : [];
  });

  function onHostAndPortsChange(values: string[]) {
    const route = unref(routeRef);
    route.downstreamHostAndPorts = values.map((m): HostAndPort => {
      const items = m.split(':');
      return {
        host: items[0],
        port: Number(items[1] ?? 80),
      };
    });
    // 每次变动下游主机地址时校验一下ip端口是否合法
    const formEl = unref(formElRef);
    formEl.validateFields(['downstreamHostAndPorts']);
  }

  const getDictionaryValue = computed(() => {
    return (field: string) => {
      const route = unref(routeRef);
      return route[field]
        ? Object.keys(route[field]).map((key) => {
            return `${key}:${route[field][key]}`;
          })
        : [];
    };
  });

  function onDictionarySelect(field: string, value: string) {
    const route = unref(routeRef);
    if (!route[field]) {
      route[field] = {};
    }
    if (String(value).includes(':')) {
      const items = String(value).split(':');
      route[field][items[0]] = items[1];
    }
  }

  function onDictionaryUnSelect(field: string, value: string) {
    const route = unref(routeRef);
    if (route[field] && String(value).includes(':')) {
      const items = String(value).split(':');
      route[field][items[0]] && delete route[field][items[0]];
    }
  }

  function handleCancel() {
    const formEl = unref(formElRef);
    formEl.clearValidate();
  }

  function handleSubmit() {
    const formEl = unref(formElRef);
    formEl.validate().then(() => {
      const route = unref(routeRef);
      const { changeOkLoading, closeModal } = modalMethods;
      changeOkLoading(true);
      const api = route.reRouteId ? update(route as UpdateRoute) : create(route as CreateRoute);
      api
        .then((res) => {
          initRoute();
          closeModal();
          emit('change', res);
        })
        .finally(() => {
          changeOkLoading(false);
        });
    });
  }

  return {
    routeRef,
    formRules,
    formTitle,
    httpMethods,
    radioOptions,
    appIdOptions,
    balancerOptions,
    getHostAndPorts,
    onHostAndPortsChange,
    getDictionaryValue,
    onDictionarySelect,
    onDictionaryUnSelect,
    handleCancel,
    handleSubmit,
  };
}
