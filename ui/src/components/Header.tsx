import { Shield, Lock } from "lucide-react";
import { WalletButton } from "./WalletButton";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-600">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Salary Vault</h1>
              <p className="text-sm text-muted-foreground">Privacy-Preserving Salary Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

