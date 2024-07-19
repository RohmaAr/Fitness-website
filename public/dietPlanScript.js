function redirectToPlan() {
    var ageGroup = document.getElementById("age-group").value;
    var bodyType = document.getElementById("body-type").value;
    
    // Redirect based on age group and body type combination
    switch (ageGroup) {
        case "teenage":
            switch (bodyType) {
                case "underweight":
                    window.location.href = "teenUnder.html";
                    return false;
                case "fit":
                    window.location.href = "teenfit.html";
                    return false;
                case "overweight":
                    window.location.href = "teenover.html";
                    return false;
            }
            break;
        case "adult":
            switch (bodyType) {
                case "underweight":
                    window.location.href = "adultUnder.html";
                    return false;
                case "fit":
                    window.location.href = "adultfit.html";
                    return false;
                case "overweight":
                    window.location.href = "adultover.html";
                    return false;
            }
            break;
        case "old":
            switch (bodyType) {
                case "underweight":
                    window.location.href = "seniorunder.html";
                    return false;
                case "fit":
                    window.location.href = "seniorfit.html";
                    return false;
                case "overweight":
                    window.location.href = "seniorover.html";
                    return false;
            }
            break;
    }
   
    return true;
}
