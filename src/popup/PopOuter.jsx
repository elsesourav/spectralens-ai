import Header from "../components/Header.jsx";
import ToggleButton from "../components/ToggleButton.jsx";
import AlwaysActiveToggle from "../components/AlwaysActiveToggle.jsx";
import EnableCopyToggle from "../components/EnableCopyToggle.jsx";
import Footer from "../components/Footer.jsx";

function PopOuter() {
  return (
    <div className="flex flex-col min-h-full p-2.5 space-y-2 justify-between select-none">
      <Header />
      <div className="space-y-2 flex-1 pt-1">
        <ToggleButton />
        <AlwaysActiveToggle />
        <EnableCopyToggle />
      </div>
      <Footer />
    </div>
  );
}

export default PopOuter;
