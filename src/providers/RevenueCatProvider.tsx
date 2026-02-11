import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import Purchases, {
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Alert, Platform } from 'react-native';

const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ENTITLEMENT_ID = 'Inflammation Score Pro';

interface RevenueCatContextType {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isPro: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  loading: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(false);

  const isPro = customerInfo?.entitlements.active[ENTITLEMENT_ID] !== undefined;

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: API_KEY_IOS });
        }

        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        const offs = await Purchases.getOfferings();
        if (offs.current) {
          setOfferings(offs.current);
        }
      } catch (error) {
        // Don't block UI on init failure
      } finally {
        setIsReady(true);
      }
    };

    init();

    const updateListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(updateListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(updateListener);
    };
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setLoading(true);
    try {
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(newInfo);
      return newInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error: any) {
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return false;
      }
      Alert.alert('Purchase Error', error.message ?? 'Something went wrong. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const restored = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      if (!restored) {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
      return restored;
    } catch (error: any) {
      Alert.alert('Restore Error', error.message ?? 'Could not restore purchases. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <RevenueCatContext.Provider
      value={{ isReady, customerInfo, offerings, isPro, purchase, restorePurchases, loading }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
}
