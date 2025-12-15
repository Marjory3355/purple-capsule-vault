import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { Lock, DollarSign, Send, Loader2, CheckCircle2, Shield } from "lucide-react";
import { BrowserProvider } from "ethers";
import {
  getContractAddress,
  hasUserSubmitted,
  getUserEntry,
  submitSalary,
  updateSalary,
  type SalaryEntry,
} from "@/lib/contract";
import { getFHEVMInstance, encryptSalary } from "@/lib/fhevm";

export default function SubmitPage() {
  const { address, isConnected, chainId } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [hasSubmission, setHasSubmission] = useState(false);
  const [userEntry, setUserEntry] = useState<SalaryEntry | null>(null);
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [step, setStep] = useState<"idle" | "encrypting" | "submitting" | "success">("idle");

  const loadUserData = useCallback(async () => {
    if (!address) return;
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");
      
      const submitted = await hasUserSubmitted(provider, address, chainId);
      setHasSubmission(submitted);
      
      if (submitted) {
        const entry = await getUserEntry(provider, address, chainId);
        setUserEntry(entry);
        if (entry) {
          setPosition(entry.position);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, [address, chainId]);

  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    }
  }, [address, chainId, isConnected, loadUserData]);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !isConnected) return;

    // Validation
    if (!position || position.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Position cannot be empty",
      });
      return;
    }

    const salaryValue = parseInt(salary);
    if (isNaN(salaryValue) || salaryValue <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a valid salary amount",
      });
      return;
    }

    setLoading(true);
    setStep("encrypting");

    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");
      const contractAddress = getContractAddress(chainId);

      // Encrypt salary
      const fhevmInstance = await getFHEVMInstance(chainId);
      const encrypted = await encryptSalary(fhevmInstance, contractAddress, address, salaryValue);

      setStep("submitting");

      // Submit or update
      const tx = hasSubmission
        ? await updateSalary(provider, encrypted.handles[0], encrypted.inputProof, position, chainId)
        : await submitSalary(provider, encrypted.handles[0], encrypted.inputProof, position, chainId);
      
      await tx.wait();

      setStep("success");
      
      toast({
        title: hasSubmission ? "Updated! ✅" : "Success! 🎉",
        description: "Your encrypted salary data has been stored successfully",
      });

      // Reset and reload
      setSalary("");
      await loadUserData();

      // Navigate to stats after delay
      setTimeout(() => {
        navigate("/stats");
      }, 2000);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: error.message || "Please try again",
      });
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case "encrypting":
        return {
          icon: <Lock className="h-6 w-6 animate-pulse" />,
          text: "Encrypting salary data...",
          color: "text-violet-600",
        };
      case "submitting":
        return {
          icon: <Send className="h-6 w-6 animate-bounce" />,
          text: "Submitting to blockchain...",
          color: "text-blue-600",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="h-6 w-6" />,
          text: "Operation successful!",
          color: "text-green-600",
        };
      default:
        return null;
    }
  };

  const stepContent = getStepContent();

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        <div className="animate-fade-in">
          <Card className="border-2 border-violet-100 dark:border-violet-900/50 shadow-xl">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {hasSubmission ? "Update Salary Data" : "Submit Salary Data"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {hasSubmission
                      ? "Update your position and salary information, data will be re-encrypted"
                      : "Enter your position and monthly salary, data will be encrypted and stored on blockchain"}
                  </CardDescription>
                </div>
              </div>

              {hasSubmission && userEntry && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-fade-in">
                  <p className="text-green-800 dark:text-green-300 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    You have already submitted salary data
                  </p>
                  <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                    Current position: <strong>{userEntry.position}</strong>
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-base font-medium">
                    Job Position / Title
                  </Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g., Software Engineer, Product Manager, Designer"
                    required
                    disabled={loading}
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Position information is publicly visible, used for statistical categorization
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-base font-medium">
                    Monthly Salary (USD)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="salary"
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g., 5000"
                      required
                      min="0"
                      disabled={loading}
                      className="h-12 text-base pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Salary data will be encrypted, only you can view the original data
                  </p>
                </div>

                {/* Progress indicator */}
                {stepContent && (
                  <div className={`flex items-center justify-center gap-3 p-4 rounded-lg bg-muted ${stepContent.color} animate-fade-in`}>
                    {stepContent.icon}
                    <span className="font-medium">{stepContent.text}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      {hasSubmission ? "Update Encrypted Data" : "Submit Encrypted Data"}
                    </span>
                  )}
                </Button>
              </form>

              {/* Security note */}
              <div className="mt-6 p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <h4 className="font-medium text-violet-800 dark:text-violet-300 mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Protection
                </h4>
                <ul className="text-sm text-violet-700 dark:text-violet-400 space-y-1">
                  <li>• Salary data is encrypted using FHE in your browser</li>
                  <li>• Encrypted data is stored on the blockchain</li>
                  <li>• Only statistical results can be decrypted and published</li>
                  <li>• Individual salaries are never revealed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
