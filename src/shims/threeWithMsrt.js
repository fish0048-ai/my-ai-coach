// three 全域 shim：在官方 three.module.js 之上補上舊版生態系仍期望存在的成員。
// - 對大多數使用情境，這個 stub 不會被實際用到，只是滿足舊版 drei / three-stdlib 的 named import。

export * from 'three/build/three.module.js';

// 某些版本的 @react-three/drei 仍從 'three' 匯入 WebGLMultisampleRenderTarget。
// 若目前 three 版本未提供，這裡提供一個最小 stub，避免 bundle 時報「not exported」錯誤。
// 若未來需要真正的多重取樣 RenderTarget，可改用對應 three 版本內建實作。
export const WebGLMultisampleRenderTarget = class {};

