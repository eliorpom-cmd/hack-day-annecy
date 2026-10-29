declare namespace App {
  interface Locals {
    user: import("./lib/db").User | null;
    business: import("./lib/db").Business | null;
  }
}
