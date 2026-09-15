import type { RabbitHoleFeatures, RabbitHoleModelPrediction, RabbitHoleModelProvider } from "../types/rabbit-hole";
import { rabbitHoleModelService } from "./rabbit-hole-model.service";

export class OnnxRabbitHoleModelProvider implements RabbitHoleModelProvider {
  async predict(features: RabbitHoleFeatures): Promise<RabbitHoleModelPrediction> {
    return rabbitHoleModelService.predict(features);
  }
}

export const onnxRabbitHoleModelProvider = new OnnxRabbitHoleModelProvider();
