import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Save,
  Upload,
  Video,
  WalletCards
} from 'lucide-react';

import {
  createPitchDeckSignature,
  getStartupPitch,
  updateStartupPitch
} from '../../services/startupService';

import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

const PitchUpdatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pitch, setPitch] = useState({
    oneLinePitch: '',
    problem: '',
    solution: '',
    targetMarket: '',
    businessModel: '',
    traction: '',
    competitors: '',
    uniqueValue: '',
    teamOverview: '',
    futurePlan: '',
    risks: ''
  });

  const [investmentDetails, setInvestmentDetails] = useState({
    fundingStage: '',
    amountRequired: '',
    equityOffered: '',
    valuationAsk: '',
    minimumInvestment: '',
    useOfFunds: '',
    expectedROI: ''
  });

  const [pitchVideoUrl, setPitchVideoUrl] = useState('');
  const [existingDeckUrl, setExistingDeckUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPitch = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getStartupPitch(id);
      const pitchData = data.pitchData;

      setCompanyName(pitchData.companyName || '');

      setPitch({
        oneLinePitch: pitchData.pitch?.oneLinePitch || '',
        problem: pitchData.pitch?.problem || '',
        solution: pitchData.pitch?.solution || '',
        targetMarket: pitchData.pitch?.targetMarket || '',
        businessModel: pitchData.pitch?.businessModel || '',
        traction: pitchData.pitch?.traction || '',
        competitors: pitchData.pitch?.competitors || '',
        uniqueValue: pitchData.pitch?.uniqueValue || '',
        teamOverview: pitchData.pitch?.teamOverview || '',
        futurePlan: pitchData.pitch?.futurePlan || '',
        risks: pitchData.pitch?.risks || ''
      });

      setInvestmentDetails({
        fundingStage: pitchData.investmentDetails?.fundingStage || '',
        amountRequired: pitchData.investmentDetails?.amountRequired || '',
        equityOffered: pitchData.investmentDetails?.equityOffered || '',
        valuationAsk:
          pitchData.investmentDetails?.valuationAsk ||
          pitchData.valuationAsk ||
          '',
        minimumInvestment:
          pitchData.investmentDetails?.minimumInvestment || '',
        useOfFunds: pitchData.investmentDetails?.useOfFunds || '',
        expectedROI: pitchData.investmentDetails?.expectedROI || ''
      });

      setPitchVideoUrl(pitchData.pitchVideoUrl || '');
      setExistingDeckUrl(pitchData.pitchDeckUrl || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pitch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPitch();
  }, [id]);

  const handlePitchChange = (e) => {
    setPitch((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleInvestmentChange = (e) => {
    setInvestmentDetails((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const uploadPitchDeckIfSelected = async () => {
    if (!selectedFile) return null;

    setUploading(true);

    const signatureResponse = await createPitchDeckSignature(id, {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      mimeType: selectedFile.type
    });

    const cloudinaryResponse = await uploadToCloudinary({
      file: selectedFile,
      upload: signatureResponse.upload
    });

    setUploading(false);

    return cloudinaryResponse;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      let uploadedPitchDeck = null;

      if (selectedFile) {
        uploadedPitchDeck = await uploadPitchDeckIfSelected();
      }

      const payload = {
        pitch,
        investmentDetails: {
          ...investmentDetails,
          amountRequired: Number(investmentDetails.amountRequired || 0),
          equityOffered: Number(investmentDetails.equityOffered || 0),
          valuationAsk: Number(investmentDetails.valuationAsk || 0),
          minimumInvestment: Number(investmentDetails.minimumInvestment || 0)
        },
        pitchVideoUrl
      };

      if (uploadedPitchDeck) {
        payload.pitchDeck = uploadedPitchDeck;
        payload.fileName = selectedFile.name;
        payload.mimeType = selectedFile.type;
      }

      const response = await updateStartupPitch(id, payload);

      setSuccess(response.message || 'Pitch updated successfully');

      if (response.startup?.pitchDeckUrl) {
        setExistingDeckUrl(response.startup.pitchDeckUrl);
      }

      setSelectedFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update pitch');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Loading pitch details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/founder')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <p className="text-sm font-semibold text-slate-500">
            Pitch Management
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <FileText size={28} />
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            Update startup pitch
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {companyName}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <FileText className="text-slate-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Pitch Story
                </h2>
                <p className="text-sm text-slate-500">
                  Explain what your startup does and why it matters.
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <Input
                label="One-line pitch *"
                name="oneLinePitch"
                value={pitch.oneLinePitch}
                onChange={handlePitchChange}
                placeholder="Example: We help small businesses raise capital faster."
              />

              <Textarea
                label="Problem *"
                name="problem"
                value={pitch.problem}
                onChange={handlePitchChange}
                placeholder="What problem are you solving?"
              />

              <Textarea
                label="Solution *"
                name="solution"
                value={pitch.solution}
                onChange={handlePitchChange}
                placeholder="How does your product solve the problem?"
              />

              <Textarea
                label="Target market *"
                name="targetMarket"
                value={pitch.targetMarket}
                onChange={handlePitchChange}
                placeholder="Who are your customers?"
              />

              <Textarea
                label="Business model"
                name="businessModel"
                value={pitch.businessModel}
                onChange={handlePitchChange}
                placeholder="How will you make money?"
              />

              <Textarea
                label="Traction"
                name="traction"
                value={pitch.traction}
                onChange={handlePitchChange}
                placeholder="Users, revenue, pilots, partnerships, growth..."
              />

              <Textarea
                label="Competitors"
                name="competitors"
                value={pitch.competitors}
                onChange={handlePitchChange}
                placeholder="Who else is solving this?"
              />

              <Textarea
                label="Unique value"
                name="uniqueValue"
                value={pitch.uniqueValue}
                onChange={handlePitchChange}
                placeholder="Why are you different?"
              />

              <Textarea
                label="Team overview"
                name="teamOverview"
                value={pitch.teamOverview}
                onChange={handlePitchChange}
                placeholder="Founder/team background"
              />

              <Textarea
                label="Future plan"
                name="futurePlan"
                value={pitch.futurePlan}
                onChange={handlePitchChange}
                placeholder="Roadmap for next 12-24 months"
              />

              <Textarea
                label="Risks"
                name="risks"
                value={pitch.risks}
                onChange={handlePitchChange}
                placeholder="Mention key risks honestly"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <WalletCards className="text-slate-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Investment Details
                </h2>
                <p className="text-sm text-slate-500">
                  Tell investors what you are raising and offering.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Funding stage
                </label>
                <select
                  name="fundingStage"
                  value={investmentDetails.fundingStage}
                  onChange={handleInvestmentChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">Select stage</option>
                  <option value="Idea">Idea</option>
                  <option value="Pre-Seed">Pre-Seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                  <option value="Growth">Growth</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Input
                label="Amount required"
                type="number"
                name="amountRequired"
                value={investmentDetails.amountRequired}
                onChange={handleInvestmentChange}
                placeholder="Example: 2000000"
              />

              <Input
                label="Equity offered (%)"
                type="number"
                name="equityOffered"
                value={investmentDetails.equityOffered}
                onChange={handleInvestmentChange}
                placeholder="Example: 10"
              />

              <Input
                label="Valuation ask *"
                type="number"
                name="valuationAsk"
                value={investmentDetails.valuationAsk}
                onChange={handleInvestmentChange}
                placeholder="Example: 10000000"
              />

              <Input
                label="Minimum investment"
                type="number"
                name="minimumInvestment"
                value={investmentDetails.minimumInvestment}
                onChange={handleInvestmentChange}
                placeholder="Example: 50000"
              />

              <Input
                label="Expected ROI"
                name="expectedROI"
                value={investmentDetails.expectedROI}
                onChange={handleInvestmentChange}
                placeholder="Example: 3x in 5 years"
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Use of funds"
                  name="useOfFunds"
                  value={investmentDetails.useOfFunds}
                  onChange={handleInvestmentChange}
                  placeholder="Product, hiring, marketing, operations..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Upload className="text-slate-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Pitch Deck
                </h2>
                <p className="text-sm text-slate-500">
                  Upload PDF, PPT, DOC, or image pitch material.
                </p>
              </div>
            </div>

            {existingDeckUrl && (
              <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                Existing pitch deck:{' '}
                <a
                  href={existingDeckUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  View file
                </a>
              </div>
            )}

            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600"
            />

            {selectedFile && (
              <p className="mt-3 text-sm text-slate-500">
                Selected file: {selectedFile.name}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Video className="text-slate-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Pitch Video
                </h2>
                <p className="text-sm text-slate-500">
                  Optional video URL for investors.
                </p>
              </div>
            </div>

            <Input
              label="Pitch video URL"
              name="pitchVideoUrl"
              value={pitchVideoUrl}
              onChange={(e) => setPitchVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Save size={18} />
              {uploading
                ? 'Uploading deck...'
                : saving
                  ? 'Saving pitch...'
                  : 'Save Pitch'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

const Input = ({ label, ...props }) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
};

const Textarea = ({ label, ...props }) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        {...props}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
};

export default PitchUpdatePage;