import { pipeline, env } from '@huggingface/transformers';

env.cacheDir = './.cache/neural-models';

class EnterprisePitchSummarizer {
  constructor() {
    this.extractor = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.lambdaLengthPenalty = 0.15; 
    this.dampingFactor = 0.85;
    this.maxIterations = 100;
    this.convergenceThreshold = 1e-6;
  }

  async _initModel() {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.modelName);
    }
    return this.extractor;
  }

  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const len = vecA.length;
    
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async summarize(rawPitch, targetSentencesCount = 3) {
    if (!rawPitch || typeof rawPitch !== 'string' || rawPitch.trim().length === 0) {
      return "";
    }

    const paragraphs = rawPitch.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    const sentencesMetadata = [];
    let absoluteIndex = 0;

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const paragraph = paragraphs[pIdx];
      const pSentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)/g) || [paragraph];
      const filteredPSentences = pSentences.map(s => s.trim()).filter(s => s.length > 12);
      const pSentenceCount = filteredPSentences.length;

      for (let sIdx = 0; sIdx < pSentenceCount; sIdx++) {
        const text = filteredPSentences[sIdx];
        const positionalBias = 1.0 + (1.0 / (sIdx + 1)) + (pIdx === 0 ? 0.5 : 0.0);
        
        sentencesMetadata.push({
          absoluteIndex,
          text,
          charLength: text.length,
          positionalBias
        });
        absoluteIndex++;
      }
    }

    const n = sentencesMetadata.length;
    if (n <= targetSentencesCount) {
      return sentencesMetadata.map(s => s.text).join(" ");
    }

    const extractor = await this._initModel();
    const textArray = sentencesMetadata.map(s => s.text);
    const tensorOutput = await extractor(textArray, { pooling: 'mean', normalize: true });
    const vectors = tensorOutput.tolist();

    const similarityMatrix = Array.from({ length: n }, () => new Float32Array(n).fill(0));
    const totalOutWeights = new Float32Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const rawSim = this._cosineSimilarity(vectors[i], vectors[j]);
        if (rawSim > 0) {
          const lengthRatio = Math.abs(Math.log(sentencesMetadata[i].charLength / sentencesMetadata[j].charLength));
          const lengthPenalty = Math.exp(-this.lambdaLengthPenalty * lengthRatio);
          const finalSim = rawSim * lengthPenalty;

          similarityMatrix[i][j] = finalSim;
          similarityMatrix[j][i] = finalSim;
          totalOutWeights[i] += finalSim;
          totalOutWeights[j] += finalSim;
        }
      }
    }

    let ranks = new Float32Array(n).fill(1.0);

    for (let iter = 0; iter < this.maxIterations; iter++) {
      const nextRanks = new Float32Array(n).fill(0);
      let maxDiff = 0;

      for (let i = 0; i < n; i++) {
        let sumInshare = 0;
        for (let j = 0; j < n; j++) {
          if (similarityMatrix[j][i] > 0 && totalOutWeights[j] > 0) {
            sumInshare += (similarityMatrix[j][i] / totalOutWeights[j]) * ranks[j];
          }
        }
        
        const baseRank = (1 - this.dampingFactor) * sentencesMetadata[i].positionalBias;
        nextRanks[i] = baseRank + this.dampingFactor * sumInshare;
        
        const diff = Math.abs(nextRanks[i] - ranks[i]);
        if (diff > maxDiff) maxDiff = diff;
      }

      ranks = nextRanks;
      if (maxDiff < this.convergenceThreshold) break;
    }

    const scoredSentences = sentencesMetadata.map((meta, index) => ({
      ...meta,
      score: ranks[index]
    }));

    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, targetSentencesCount)
      .sort((a, b) => a.absoluteIndex - b.absoluteIndex);

    return topSentences.map(s => s.text).join(" ");
  }
}

export default new EnterprisePitchSummarizer();