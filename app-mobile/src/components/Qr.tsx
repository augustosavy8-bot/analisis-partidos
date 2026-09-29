import { View } from "react-native";
import { SvgXml } from "react-native-svg";

/** QR que ya viene dibujado (SVG) desde el servidor. */
export function Qr({ svg, lado = 200 }: { svg: string; lado?: number }) {
  return (
    <View style={{ width: lado, height: lado, backgroundColor: "#fff", borderRadius: 12, padding: 8 }} accessibilityLabel="Código QR de tu tarjeta" accessible>
      <SvgXml xml={svg} width="100%" height="100%" />
    </View>
  );
}
