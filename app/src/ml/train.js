// Echtes Training eines kleinen neuronalen Netzes mit TensorFlow.js (Modul 8).
import { getTf } from "./models.js";
import { MATERIALS, BANDS } from "../logic/nir.js";

/**
 * @param {number[]} hidden  Neuronen pro versteckter Schicht, z. B. [16, 16]
 * @param {{train, test}} data
 * @param {number} epochs
 * @param {(epoch:number, logs:object)=>void} onEpoch
 */
export async function trainNetwork(hidden, data, epochs, onEpoch) {
  const tf = await getTf();
  const model = tf.sequential();
  let seed = 11;
  hidden.forEach((units, i) => model.add(tf.layers.dense({
    units, activation: "relu", inputShape: i === 0 ? [BANDS] : undefined,
    kernelInitializer: tf.initializers.heNormal({ seed: seed++ })
  })));
  model.add(tf.layers.dense({ units: MATERIALS.length, activation: "softmax", kernelInitializer: tf.initializers.glorotUniform({ seed: 99 }) }));
  model.compile({ optimizer: tf.train.adam(0.01), loss: "categoricalCrossentropy", metrics: ["accuracy"] });

  const X = tf.tensor2d(data.train.map(r => r.x));
  const Y = tf.oneHot(tf.tensor1d(data.train.map(r => r.y), "int32"), MATERIALS.length);
  const Xt = tf.tensor2d(data.test.map(r => r.x));
  const t0 = performance.now();
  const curve = [];
  try {
    await model.fit(X, Y, {
      epochs, batchSize: 32, shuffle: false, verbose: 0,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const pred = tf.tidy(() => model.predict(Xt).argMax(1).dataSync());
          const acc = pred.reduce((s, v, i) => s + (v === data.test[i].y), 0) / data.test.length;
          curve.push({ epoch: epoch + 1, loss: logs.loss, acc });
          onEpoch?.(epoch + 1, { loss: logs.loss, acc });
          await tf.nextFrame();
        }
      }
    });
    const pred = tf.tidy(() => model.predict(Xt).argMax(1).dataSync());
    const confusion = MATERIALS.map(() => MATERIALS.map(() => 0));
    data.test.forEach((r, i) => { confusion[r.y][pred[i]]++; });
    const accuracy = pred.reduce((s, v, i) => s + (v === data.test[i].y), 0) / data.test.length;
    return { accuracy, curve, confusion, ms: performance.now() - t0, params: model.countParams() };
  } finally {
    X.dispose(); Y.dispose(); Xt.dispose(); model.dispose();
  }
}
