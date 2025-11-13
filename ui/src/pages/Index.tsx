import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Lock, DollarSign, TrendingUp, Shield, Users, Briefcase, BarChart3 } from "lucide-react";
import { BrowserProvider } from "ethers";
import { 
  getSalaryVaultContract,
  getContractAddress,
  hasUserSubmitted,
  getUserEntry,
  getActiveEntryCount,
  getGlobalStats,
  submitSalary,
  updateSalary,
  deleteSalary,
  requestGlobalStats,
  getPositionStats,
  requestPositionStats,
  mockDecryptGlobalStats,
  mockDecryptPositionStats,
  type SalaryEntry
} from "@/lib/contract";
import { getFHEVMInstance, encryptSalary } from "@/lib/fhevm";

export default function Index() {
  const { address, isConnected, chainId } = useAccount();
  const [activeSection, setActiveSection] = useState<'home' | 'submit' | 'manage' | 'stats'>('home');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // User submission state
  const [hasSubmission, setHasSubmission] = useState(false);
  const [userEntry, setUserEntry] = useState<SalaryEntry | null>(null);

  // Form fields
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');

  // Statistics
  const [activeCount, setActiveCount] = useState(0);
  const [globalStats, setGlobalStats] = useState<{ average: number; count: number; finalized: boolean } | null>(null);
  const [positionFilter, setPositionFilter] = useState('');
  const [positionStats, setPositionStats] = useState<{ average: number; count: number; finalized: boolean } | null>(null);
  const [isWaitingForDecryption, setIsWaitingForDecryption] = useState(false);
  const [decryptedMySalary, setDecryptedMySalary] = useState<number | null>(null);
  const [isDecryptingMySalary, setIsDecryptingMySalary] = useState(false);

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
      toast({
        variant: "destructive",
        title: "Error loading user data",
        description: error instanceof Error ? error.message : "Failed to load user data",
      });
    }
  }, [address, chainId, toast]);

  const loadStatistics = useCallback(async () => {
    if (!isConnected) return;
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");
      
      // Log network and contract info for debugging
      console.log("Loading statistics...");
      console.log("- Chain ID:", chainId);
      console.log("- Contract address:", getContractAddress(chainId));
      
      const count = await getActiveEntryCount(provider, chainId);
      console.log("- Active entry count:", count);
      setActiveCount(count);
      
      const stats = await getGlobalStats(provider, chainId);
      console.log("- Global stats:", stats);
      setGlobalStats(stats);
      
      if (stats.finalized && stats.average > 0) {
        console.log("Statistics are available");
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
      toast({
        variant: "destructive",
        title: "Error loading statistics",
        description: error instanceof Error ? error.message : "Failed to load statistics",
      });
    }
  }, [isConnected, chainId, toast]);

  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
      loadStatistics();
    }
  }, [address, chainId, isConnected, loadUserData, loadStatistics]);

  const handleSubmitSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !isConnected) {
      toast({
        variant: "destructive",
        title: "Not connected",
        description: "Please connect your wallet first.",
      });
      return;
    }

    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");
      const contractAddress = getContractAddress(chainId);

      toast({
        title: "Encrypting salary...",
        description: "Your salary is being encrypted client-side.",
      });

      // Initialize FHEVM and encrypt salary
      const fhevmInstance = await getFHEVMInstance(chainId);
      const salaryValue = parseInt(salary);
      const encrypted = await encryptSalary(fhevmInstance, contractAddress, address, salaryValue);

      toast({
        title: "Submitting to blockchain...",
        description: "Please confirm the transaction in your wallet.",
      });

      // Submit encrypted salary
      const tx = await submitSalary(provider, encrypted.handles[0], encrypted.inputProof, position, chainId);
      await tx.wait();

      toast({
        title: "Success! 🎉",
        description: "Your encrypted salary has been submitted successfully.",
      });

      // Reset form and reload data
      setSalary('');
      await loadUserData();
      await loadStatistics();
      setActiveSection('stats');
    } catch (error: any) {
      console.error("Error submitting salary:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message || "Failed to submit salary. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !isConnected) return;

    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");
      const contractAddress = getContractAddress(chainId);

      toast({
        title: "Encrypting new salary...",
        description: "Encrypting your updated salary data.",
      });

      const fhevmInstance = await getFHEVMInstance(chainId);
      const salaryValue = parseInt(salary);
      const encrypted = await encryptSalary(fhevmInstance, contractAddress, address, salaryValue);

      toast({
        title: "Updating...",
        description: "Please confirm the transaction in your wallet.",
      });

      const tx = await updateSalary(provider, encrypted.handles[0], encrypted.inputProof, position, chainId);
      await tx.wait();

      toast({
        title: "Updated! ✅",
        description: "Your salary entry has been updated successfully.",
      });

      setSalary('');
      await loadUserData();
      await loadStatistics();
    } catch (error: any) {
      console.error("Error updating salary:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update salary.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalary = async () => {
    if (!address || !isConnected || !window.confirm("Are you sure you want to delete your salary entry?")) return;

    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      const tx = await deleteSalary(provider, chainId);
      await tx.wait();

      toast({
        title: "Deleted",
        description: "Your salary entry has been removed.",
      });

      setPosition('');
      setSalary('');
      await loadUserData();
      await loadStatistics();
      setActiveSection('submit');
    } catch (error: any) {
      console.error("Error deleting salary:", error);
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message || "Failed to delete salary entry.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestGlobalStats = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      toast({
        title: "Requesting decryption...",
        description: "Requesting to decrypt the average salary statistics.",
      });

      const tx = await requestGlobalStats(provider, chainId);
      await tx.wait();

      // Show network-specific wait time
      const isTestnet = chainId === 11155111;
      const estimatedWaitTime = isTestnet ? "3-5 minutes" : "30-60 seconds";
      
      toast({
        title: "Decryption request sent! ⏳",
        description: `Processing on ${isTestnet ? 'Sepolia testnet' : 'local network'}. Estimated wait: ${estimatedWaitTime}. You can continue browsing while waiting.`,
        duration: 5000,
      });

      // Allow user to continue browsing
      setLoading(false);
      setIsWaitingForDecryption(true);

      // Poll for results every 10 seconds (less aggressive)
      let pollCount = 0;
      const maxPolls = 60; // Poll for up to 10 minutes
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        const minutesElapsed = Math.floor((pollCount * 10) / 60);
        const secondsElapsed = (pollCount * 10) % 60;
        const timeStr = minutesElapsed > 0 
          ? `${minutesElapsed}m ${secondsElapsed}s`
          : `${secondsElapsed}s`;
        
        console.log(`⏳ Checking decryption status... [${timeStr} elapsed]`);
        
        try {
          const stats = await getGlobalStats(provider, chainId);
          
          if (stats.finalized) {
            clearInterval(pollInterval);
            setIsWaitingForDecryption(false);
            await loadStatistics();
            toast({
              title: "🎉 Decryption complete!",
              description: `Average salary: $${stats.average.toLocaleString()}/month (took ${timeStr})`,
              duration: 5000,
            });
          } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsWaitingForDecryption(false);
            toast({
              title: "⏰ Decryption timeout",
              description: "The decryption is taking longer than expected. Click 'Check Now' button to manually verify if it's complete.",
            });
          } else if (pollCount % 6 === 0) {
            // Update user every minute
            const minutesLeft = Math.ceil((maxPolls - pollCount) * 10 / 60);
            console.log(`💡 Still waiting... (checking again in 10s, ~${minutesLeft}min remaining)`);
          }
        } catch (error) {
          console.error("Error polling for results:", error);
        }
      }, 10000); // Poll every 10 seconds instead of 5
    } catch (error: any) {
      console.error("Error requesting stats:", error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message || "Failed to request statistics decryption.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMockDecryptGlobalStats = async () => {
    if (!isConnected || chainId !== 31337) return;
    
    // Show instructions to use manual script
    toast({
      title: "Use Manual Script",
      description: "Run in terminal: npx hardhat run scripts/trigger-local-decrypt.ts --network localhost",
    });
    
    // Open a modal or alert with detailed instructions
    const confirmed = window.confirm(
      "Local mock decryption requires running Hardhat script.\n\n" +
      "Please follow these steps:\n\n" +
      "1. Open a new terminal window\n" +
      "2. Navigate to project directory: cd e:\\zama\\purple-capsule-vault\n" +
      "3. Run script: npx hardhat run scripts/trigger-local-decrypt.ts --network localhost\n" +
      "4. Wait for script completion (few seconds)\n" +
      "5. Return to browser and refresh page\n\n" +
      "Understand? Click OK to copy command to clipboard."
    );
    
    if (confirmed) {
      // Copy command to clipboard
      const command = "npx hardhat run scripts/trigger-local-decrypt.ts --network localhost";
      try {
        await navigator.clipboard.writeText(command);
        toast({
          title: "✅ Command Copied",
          description: "Please paste and run in terminal",
        });
      } catch (err) {
        toast({
          title: "Command",
          description: command,
        });
      }
    }
  };

  const handleRequestPositionStats = async () => {
    if (!isConnected || !positionFilter) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter a position name to query statistics.",
      });
      return;
    }
    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");

      toast({
        title: "Requesting position stats...",
        description: `Decrypting average for "${positionFilter}"`,
      });

      const tx = await requestPositionStats(provider, positionFilter, chainId);
      await tx.wait();

      toast({
        title: "Request sent!",
        description: "Position statistics will be available shortly.",
      });

      setTimeout(async () => {
        try {
          const stats = await getPositionStats(provider, positionFilter, chainId);
          setPositionStats(stats);
        } catch (error) {
          console.error("Error loading position stats:", error);
        }
      }, 5000);
    } catch (error: any) {
      console.error("Error requesting position stats:", error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message || "Failed to request position statistics.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMockDecryptPositionStats = async () => {
    if (!isConnected || chainId !== 31337 || !positionFilter) return;
    
    toast({
      title: "Position Stats Decryption",
      description: "Position stats mock decrypt not supported on localhost. Please use global stats or test on Sepolia testnet",
    });
  };

  const handleDecryptMySalary = async () => {
    if (!isConnected || !address || chainId !== 31337) return;
    if (!hasSubmission || !userEntry) {
      toast({
        variant: "destructive",
        title: "Data Not Found",
        description: "You haven't submitted salary data yet",
      });
      return;
    }

    setIsDecryptingMySalary(true);
    try {
      const ethereum = (window as any).ethereum;
      const provider = new BrowserProvider(ethereum, "any");
      const contract = getSalaryVaultContract(provider, chainId);
      const contractAddress = getContractAddress(chainId);

      toast({
        title: "Decrypting...",
        description: "Decrypting your salary data (localhost only)",
      });

      // Get encrypted salary data
      const entryId = await contract.userEntryId(address);
      const encryptedSalary = await contract.getEncryptedSalary(entryId);

      console.log("Encrypted salary handle:", encryptedSalary);

      // Initialize FHEVM instance
      const fhevmInstance = await getFHEVMInstance(chainId);

      // Use userDecryptHandleBytes32 to decrypt (localhost doesn't need signature)
      console.log("Decrypting using userDecryptHandleBytes32...");
      
      // MockFhevmInstance decrypt method
      const decrypted = await (fhevmInstance as any).decrypt(encryptedSalary);
      const salaryValue = Number(decrypted);

      console.log("Decrypted salary:", salaryValue);

      setDecryptedMySalary(salaryValue);

      toast({
        title: "✅ Decryption Successful!",
        description: `Your monthly salary is $${salaryValue.toLocaleString()}`,
      });
    } catch (error: any) {
      console.error("Error decrypting salary:", error);
      toast({
        variant: "destructive",
        title: "Decryption Failed",
        description: error.message || "Unable to decrypt salary data",
      });
    } finally {
      setIsDecryptingMySalary(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <section className="text-center space-y-8 mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-sm font-semibold">
              <Shield className="h-5 w-5" />
              Powered by Zama FHEVM - Fully Homomorphic Encryption
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Salary Vault
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Encrypt your <strong className="text-purple-600 dark:text-purple-400">salary</strong> and <strong className="text-purple-600 dark:text-purple-400">position</strong> data
              <br />
              View <strong className="text-indigo-600 dark:text-indigo-400">average salary</strong> statistics while protecting personal privacy
            </p>

            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-2xl bg-amber-100 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 max-w-md">
                <p className="text-amber-800 dark:text-amber-300 font-semibold">
                  🔐 Please connect your wallet to get started
                </p>
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader>
                <Lock className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle className="text-xl">End-to-End Encryption</CardTitle>
                <CardDescription className="text-base">
                  Salary and position data are encrypted using FHE before being stored on-chain
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle className="text-xl">Average Salary Statistics</CardTitle>
                <CardDescription className="text-base">
                  Calculate average salaries on encrypted data, only publish statistical results
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle className="text-xl">Position-Based Statistics</CardTitle>
                <CardDescription className="text-base">
                  View average salaries by job position to understand industry compensation levels
                </CardDescription>
              </CardHeader>
            </Card>
          </section>

          <section className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="space-y-6">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="h-6 w-6 text-purple-600" />
                    Submit Encrypted Salary
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    Enter your position and monthly salary, data is encrypted in browser using FHE before submission to blockchain
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-indigo-600" />
                    On-Chain Encrypted Storage
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    Smart contract accumulates and calculates statistics on all encrypted salary data
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                    Decrypt Average Salary
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    When decryption is requested, only average salary and participant count are publicly revealed, individual salaries remain confidential
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeSection === 'home' ? "default" : "outline"}
            onClick={() => setActiveSection('home')}
            className="whitespace-nowrap"
          >
            <Shield className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Button
            variant={activeSection === 'submit' ? "default" : "outline"}
            onClick={() => setActiveSection('submit')}
            className="whitespace-nowrap"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {hasSubmission ? 'Update Salary' : 'Submit Salary'}
          </Button>
          {hasSubmission && (
            <Button
              variant={activeSection === 'manage' ? "default" : "outline"}
              onClick={() => setActiveSection('manage')}
              className="whitespace-nowrap"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              My Data
            </Button>
          )}
          <Button
            variant={activeSection === 'stats' ? "default" : "outline"}
            onClick={() => setActiveSection('stats')}
            className="whitespace-nowrap"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </Button>
        </div>

        {/* Home Section */}
        {activeSection === 'home' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  Welcome to Salary Vault
                </CardTitle>
                <CardDescription className="text-base">
                  Currently <strong className="text-purple-600">{activeCount}</strong> users have submitted encrypted salary data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => setActiveSection('submit')}
                    size="lg"
                    className="h-24 text-lg"
                  >
                    <DollarSign className="h-6 w-6 mr-2" />
                    {hasSubmission ? 'Update My Salary' : 'Submit Salary Data'}
                  </Button>
                  <Button 
                    onClick={() => setActiveSection('stats')}
                    variant="outline"
                    size="lg"
                    className="h-24 text-lg"
                  >
                    <BarChart3 className="h-6 w-6 mr-2" />
                    View Statistics
                  </Button>
                </div>
                
                {hasSubmission && userEntry && (
                  <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-green-800 dark:text-green-300 font-semibold">
                      ✅ You have submitted salary data
                    </p>
                    <p className="text-green-700 dark:text-green-400 mt-1">
                      Position: <strong>{userEntry.position}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submit/Update Section */}
        {activeSection === 'submit' && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  {hasSubmission ? 'Update Salary Data' : 'Submit Salary Data'}
                </CardTitle>
                <CardDescription className="text-base">
                  {hasSubmission 
                    ? 'Update your position and salary information, data will be re-encrypted and stored'
                    : 'Enter your position and monthly salary, data will be encrypted and stored on blockchain'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={hasSubmission ? handleUpdateSalary : handleSubmitSalary} className="space-y-6">
                  <div>
                    <Label htmlFor="position" className="text-base">Job Position / Title</Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g., Software Engineer, Product Manager, Designer"
                      required
                      className="mt-2 text-base h-12"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Position information is publicly visible, used for statistical categorization
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="salary" className="text-base">Monthly Salary (USD)</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g., 5000"
                      required
                      min="0"
                      className="mt-2 text-base h-12"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Salary data will be encrypted, only you can view the original data
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    {loading ? "Processing..." : hasSubmission ? "Update Salary Data" : "Submit Salary Data"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manage Section */}
        {activeSection === 'manage' && hasSubmission && userEntry && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Briefcase className="h-6 w-6" />
                  My Salary Data
                </CardTitle>
                <CardDescription className="text-base">
                  Manage your submitted encrypted salary information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Position</Label>
                    <p className="text-xl font-semibold mt-1">{userEntry.position}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Salary Data</Label>
                    {decryptedMySalary !== null ? (
                      <div className="mt-2">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ${decryptedMySalary.toLocaleString()} / month
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ✅ Decrypted (only visible to you)
                        </p>
                      </div>
                    ) : (
                      <>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        <Lock className="h-4 w-4 mr-1" />
                        Encrypted
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Your salary data is encrypted and stored
                        </p>
                        {chainId === 31337 && (
                          <Button
                            onClick={handleDecryptMySalary}
                            disabled={isDecryptingMySalary}
                            variant="outline"
                            size="sm"
                            className="mt-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            {isDecryptingMySalary ? "Decrypting..." : "🔓 View My Salary"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Submission Time</Label>
                    <p className="text-base mt-1">
                      {new Date(userEntry.timestamp * 1000).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <Button 
                    onClick={() => setActiveSection('submit')} 
                    className="w-full"
                    size="lg"
                  >
                    Update Salary Data
                  </Button>
                  <Button 
                    onClick={handleDeleteSalary} 
                    variant="destructive"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Deleting..." : "Delete My Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Statistics Section */}
        {activeSection === 'stats' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Global Average Salary
                </CardTitle>
                <CardDescription className="text-base">
                  Average value of all users' encrypted salary data after decryption
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800">
                  {globalStats?.finalized ? (
                    <>
                      <div className="text-4xl font-bold text-purple-700 dark:text-purple-300">
                        ${globalStats.average.toLocaleString()} / month
                      </div>
                      <p className="text-purple-600 dark:text-purple-400 mt-2">
                        Based on data from {globalStats.count} users
                      </p>
                    </>
                  ) : (
                    <div className="text-center">
                      {isWaitingForDecryption ? (
                        <>
                          <p className="text-yellow-600 dark:text-yellow-400 mb-4 flex items-center justify-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Waiting for decryption to complete...
                          </p>
                          <Button 
                            onClick={async () => {
                              const ethereum = (window as any).ethereum;
                              const provider = new BrowserProvider(ethereum, "any");
                              await loadStatistics();
                              toast({
                                title: "Status checked",
                                description: globalStats?.finalized ? "Decryption complete!" : "Still processing...",
                              });
                            }}
                            variant="outline"
                          >
                            🔄 Check Now
                          </Button>
                          <p className="text-sm text-gray-500 mt-2">
                            Decryption may take 3-10 minutes on Sepolia testnet
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            💡 Tip: <a 
                              href={`https://sepolia.etherscan.io/address/${getContractAddress(chainId)}#events`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Check Etherscan
                            </a> for 'StatsPublished' event
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Average salary data not yet decrypted
                          </p>
                          <div className="flex flex-col gap-2">
                          <Button 
                            onClick={handleRequestGlobalStats}
                            disabled={loading || activeCount === 0}
                          >
                            {loading ? "Requesting..." : "Request Decrypt Statistics"}
                          </Button>
                            {chainId === 31337 && activeCount > 0 && (
                              <Button 
                                onClick={handleMockDecryptGlobalStats}
                                disabled={loading}
                                variant="outline"
                                className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              >
                                🛠️ Use Manual Script to Decrypt
                              </Button>
                            )}
                          </div>
                          {activeCount === 0 && (
                            <p className="text-sm text-gray-500 mt-2">
                              At least 1 user submission required
                            </p>
                          )}
                          {chainId === 31337 && activeCount > 0 && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                              💡 Tip: Click button to get manual decrypt command (requires terminal)
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {activeCount}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Statistics Status</p>
                    <div className="mt-1 flex justify-center">
                      {globalStats?.finalized ? (
                        <Badge variant="default" className="text-base px-3 py-1">Decrypted</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-base px-3 py-1">Encrypted</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Position Average Salary
                </CardTitle>
                <CardDescription className="text-base">
                  View average salary statistics by job position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Input
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    placeholder="Enter position name, e.g., Software Engineer"
                    className="text-base h-12"
                  />
                  <Button 
                    onClick={handleRequestPositionStats}
                    disabled={loading || !positionFilter}
                    className="whitespace-nowrap"
                  >
                    {loading ? "Querying..." : "Query"}
                  </Button>
                  {chainId === 31337 && positionFilter && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      ⚠️ Position stats mock decrypt not supported on localhost, recommend testing on Sepolia testnet
                    </p>
                  )}
                </div>

                {positionStats && positionStats.finalized ? (
                  <div className="p-6 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-2 border-indigo-200 dark:border-indigo-800">
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                      Position: <strong>{positionFilter}</strong>
                    </p>
                    <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                      ${positionStats.average.toLocaleString()} / month
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 mt-2">
                      Based on data from {positionStats.count} {positionStats.count === 1 ? 'user' : 'users'}
                    </p>
                  </div>
                ) : positionStats && !positionStats.finalized ? (
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-600 dark:text-yellow-400">
                      Position statistics are being decrypted. Please wait...
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
