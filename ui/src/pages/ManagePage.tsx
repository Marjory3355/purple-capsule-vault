import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { Briefcase, Trash2, Edit, Lock, Calendar, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { BrowserProvider } from "ethers";
import { hasUserSubmitted, getUserEntry, deleteSalary, type SalaryEntry } from "@/lib/contract";

export default function ManagePage() {
  const { address, isConnected, chainId } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [hasSubmission, setHasSubmission] = useState(false);
  const [userEntry, setUserEntry] = useState<SalaryEntry | null>(null);

  const loadUserData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      const submitted = await hasUserSubmitted(provider, address, chainId);
      setHasSubmission(submitted);

      if (submitted) {
        const entry = await getUserEntry(provider, address, chainId);
        setUserEntry(entry);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast({
        variant: "destructive",
        title: "Loading Failed",
        description: "Unable to load user data",
      });
    } finally {
      setLoading(false);
    }
  }, [address, chainId, toast]);

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

  const handleDelete = async () => {
    if (!address || !isConnected) return;

    const confirmed = window.confirm("Are you sure you want to delete your salary data? This action cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      const tx = await deleteSalary(provider, chainId);
      await tx.wait();

      toast({
        title: "Deleted Successfully",
        description: "Your salary data has been removed",
      });

      setHasSubmission(false);
      setUserEntry(null);

      navigate("/submit");
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Please try again",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </PageTransition>
    );
  }

  if (!hasSubmission) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Data Found</h2>
              <p className="text-muted-foreground mb-6">
                You haven't submitted salary data yet. Please submit your data first.
              </p>
              <Button onClick={() => navigate("/submit")} className="bg-gradient-to-r from-violet-600 to-purple-600">
                Submit Salary Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* User Entry Card */}
        <div className="animate-fade-in">
          <Card className="border-2 border-violet-100 dark:border-violet-900/50 shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">My Salary Data</CardTitle>
                  <CardDescription>View and manage your encrypted salary information</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Entry Info */}
              {userEntry && (
                <div className="grid gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Briefcase className="h-4 w-4" />
                      Position
                    </div>
                    <p className="text-xl font-semibold">{userEntry.position}</p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      Submission Time
                    </div>
                    <p className="text-lg">{new Date(userEntry.timestamp * 1000).toLocaleString("en-US")}</p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Lock className="h-4 w-4" />
                      Salary Status
                    </div>
                    <p className="text-lg text-violet-600 font-medium">🔐 Encrypted & Stored</p>
                  </div>
                </div>
              )}

              {/* Info about encryption */}
              <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <h4 className="font-medium text-violet-800 dark:text-violet-300 mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  About Your Encrypted Data
                </h4>
                <p className="text-sm text-violet-700 dark:text-violet-400 mb-3">
                  Your salary is encrypted using Fully Homomorphic Encryption (FHE). Individual salaries cannot be
                  decrypted - only aggregate statistics (like average salary) can be revealed through the decryption
                  oracle.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/stats")}
                  className="border-violet-300 text-violet-700 hover:bg-violet-100"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Statistics
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => navigate("/submit")}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Data
                </Button>
                <Button onClick={handleDelete} disabled={deleting} variant="destructive" className="flex-1">
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
