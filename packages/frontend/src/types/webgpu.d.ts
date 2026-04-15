interface GPU {
  requestAdapter(): Promise<GPUAdapter | null>;
}

interface GPUAdapter {}

interface Navigator {
  gpu?: GPU;
}
